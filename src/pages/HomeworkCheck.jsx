import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, X, Send, BookOpen, Star, Hash, User, Camera, Layers, ClipboardList, Loader2, Plus, Image as ImageIcon, Menu, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, updateDoc, increment } from 'firebase/firestore';
import AIHomeworkCheckerCard from '../components/AIHomeworkCheckerCard';

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL;

export default function HomeworkCheck({ user }) {
  // Caches for fast UI loading
  const [students, setStudents] = useState(() => {
    if (!user) return [];
    try { const cached = localStorage.getItem(`edu_students_${user.uid}`); return cached ? JSON.parse(cached) : []; } catch { return []; }
  });
  const [classGroups, setClassGroups] = useState(() => {
    if (!user) return [];
    try { const cached = localStorage.getItem(`edu_classes_${user.uid}`); return cached ? JSON.parse(cached) : []; } catch { return []; }
  });

  const [formData, setFormData] = useState({ classGroup: '', student: '', subject: '', taskNum: 1, page: 1 });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Chat History Management
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  // Feed of AI responses
  const [aiFeed, setAiFeed] = useState([]);
  const [todayDbCount, setTodayDbCount] = useState(0);

  // Calculate days since user registration
  const daysSinceRegistration = useMemo(() => {
    if (!user?.metadata?.creationTime) return 1;
    const created = new Date(user.metadata.creationTime);
    const now = new Date();
    return Math.max(1, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
  }, [user]);

  const feedBottomRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        setStudents(data.students || []);
        setClassGroups(data.classes || []);
        localStorage.setItem(`edu_students_${user.uid}`, JSON.stringify(data.students || []));
        localStorage.setItem(`edu_classes_${user.uid}`, JSON.stringify(data.classes || []));
      }
    }, (err) => {
      console.error("Ошибка прослушивания данных пользователя:", err);
    });
    return () => unsubscribe();
  }, [user]);

  // Load Chats list
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const chatList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid needing a composite index in Firestore
      chatList.sort((a, b) => (b.lastUpdated?.seconds || Infinity) - (a.lastUpdated?.seconds || Infinity));
      setChats(chatList);
      setIsLoadingChats(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Load Messages for Current Chat
  useEffect(() => {
    // 1. If no user, or neither chat nor submission is active, clear feed.
    // We include isSubmitting to ensure we don't clear the feed while a response is being processed.
    if (!user || (!currentChatId && !isSubmitting)) {
      setAiFeed([]);
      return;
    }

    // 2. If we don't have a chatId yet (new chat being created), just wait.
    if (!currentChatId) return;

    const q = query(
      collection(db, 'homeworks'),
      where('chatId', '==', currentChatId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const messages = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
      }));
      
      // Sort messages: local (no timestamp) go to bottom
      messages.sort((a, b) => (a.timestamp?.seconds || Infinity) - (b.timestamp?.seconds || Infinity));
      
      // CRITICAL FIX: Only update feed if we have messages OR if we are not in the middle of a submission.
      // This prevents "flicker/deletion" when the snapshot is empty but a doc was just added.
      if (messages.length > 0 || !isSubmitting) {
        setAiFeed(messages);
      }
    }, (err) => {
      console.error("Ошибка загрузки сообщений:", err);
      setStatusMsg('⚠️ Ошибка загрузки сообщений');
    });

    return () => unsubscribe();
  }, [user, currentChatId, isSubmitting]);

  // Extract grade helper
  const getGrade = (text) => {
    if (!text) return "";
    const m = text.match(/ОЦЕНКА:\s*([^\n]+)/i);
    if (!m) return "";
    return m[1].trim()
      .replace(/\?\*\)[()'"№;:*?\s]+\*\?/g, '')
      .replace(/\$\$%\$!@#&&&&|&&&&/g, '');
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return '';
    const d = new Date(timestamp.seconds * 1000);
    const today = new Date().toLocaleDateString('ru-RU');
    if (d.toLocaleDateString('ru-RU') === today) return 'Сегодня';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  // Count today's checks from Firestore
  const [totalToday, setTotalToday] = useState(0);

  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toLocaleDateString('ru-RU');
    const q = query(
      collection(db, 'homeworks'),
      where('userId', '==', user.uid),
      where('dateStr', '==', todayStr)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setTotalToday(snap.size);
    }, (err) => console.error("Total today error:", err));
    return () => unsubscribe();
  }, [user]);

  const feedRef = useRef(null);

  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiFeed]);

  const startNewChat = () => {
    setCurrentChatId(null);
    setAiFeed([]);
    setFormData({ classGroup: '', student: '', subject: 'Математика', taskNum: 1, page: 1 });
    setIsSidebarOpen(false);
  };

  const selectChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setFormData(prev => ({ ...prev, classGroup: chat.classGroup, subject: chat.subject }));
      setCurrentChatId(chatId);
    }
    setIsSidebarOpen(false);
  };

  const resetForm = () => {
    setFormData({ classGroup: '', student: '', subject: 'Математика', taskNum: 1, page: 1 });
    setImagePreviews([]);
    setImageFiles([]);
    setStatusMsg('');
    setAttemptedSubmit(false);
  };

  const clearPhotoOnly = () => {
    setImagePreviews([]);
    setImageFiles([]);
    setStatusMsg('');
    setAttemptedSubmit(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
        canvas.toBlob((blob) => {
          const processedFile = new File([blob], file.name, { type: 'image/jpeg' });
          setImageFiles([processedFile]);
          setImagePreviews([canvas.toDataURL('image/jpeg')]);
        }, 'image/jpeg', 0.9);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset to allow uploading same file again
  };

  const isFormValid = formData.classGroup && formData.student && formData.subject && formData.taskNum >= 1 && formData.page >= 1 && imageFiles.length > 0;

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
    if (!isFormValid) return;

    setIsSubmitting(true);
    setStatusMsg('ИИ анализирует...');

    const payload = new FormData();
    payload.append('class', formData.classGroup);
    payload.append('name', formData.student);
    payload.append('subject', formData.subject);
    payload.append('task num', formData.taskNum.toString());
    if (formData.page) payload.append('page', parseInt(formData.page, 10).toString());
    imageFiles.forEach(file => {
      payload.append('photo', file);
    });
    if (user) payload.append('userId', user.uid);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: payload
      });

      if (!response.ok) throw new Error('Ошибка сервера: ' + response.status);

      const rawText = await response.text();
      let finalAiText = '';

      try {
        const data = JSON.parse(rawText);
        finalAiText = data.response || data.text || rawText;
      } catch (e) {
        finalAiText = rawText;
      }

      if (!finalAiText) finalAiText = "Проверка завершена.";

      let chatId = currentChatId;
      
      // Safety check: If form Class/Subject changed, don't save to old chat
      if (chatId) {
        const activeChat = chats.find(c => c.id === chatId);
        if (activeChat && (activeChat.classGroup !== formData.classGroup || activeChat.subject !== formData.subject)) {
          chatId = null; // Forces creation of a new relevant chat
        }
      }
      
      // Create new chat if not exists
      if (!chatId) {
        const chatDoc = await addDoc(collection(db, 'chats'), {
          userId: user.uid,
          classGroup: formData.classGroup,
          subject: formData.subject,
          lastUpdated: serverTimestamp(),
          createdAt: serverTimestamp(),
          messageCount: 1,
          lastGrade: getGrade(finalAiText)
        });
        chatId = chatDoc.id;
        setCurrentChatId(chatId);
      } else {
        // Update lastUpdated
        await updateDoc(doc(db, 'chats', chatId), {
          lastUpdated: serverTimestamp(),
          messageCount: increment(1),
          lastGrade: getGrade(finalAiText)
        });
        // Important: DON'T call setCurrentChatId(chatId) if it's already the same,
        // it causes useEffect to restart and can cause a flash/clear of the feed.
      }

      // Add optimistic message to the feed immediately
      const optimisticMsg = {
        id: 'temp-' + Date.now(),
        chatId: chatId,
        userId: user.uid,
        classGroup: formData.classGroup,
        subject: formData.subject,
        student: formData.student,
        taskNum: formData.taskNum,
        aiResponse: finalAiText,
        preview: imagePreviews[0],
        timestamp: null // Local sort will put it at bottom
      };
      
      setAiFeed(prev => [...prev, optimisticMsg]);

      try {
        const currentDateStr = new Date().toLocaleDateString('ru-RU');
        await addDoc(collection(db, 'homeworks'), {
          chatId: chatId,
          userId: user.uid,
          dateStr: currentDateStr,
          classGroup: formData.classGroup,
          subject: formData.subject,
          student: formData.student,
          taskNum: formData.taskNum,
          aiResponse: finalAiText,
          timestamp: serverTimestamp(),
          preview: imagePreviews[0]
        });
        
        setStatusMsg('✅ Проверено');
        clearPhotoOnly();
        
        // Short delay to ensure Firestore listener picks up the new message
        // and we don't have a "flash" of the Loading state.
        setTimeout(() => {
          setIsSubmitting(false);
        }, 500);

      } catch (dbError) {
        console.error("Ошибка сохранения в базу:", dbError);
        setStatusMsg('⚠️ Ответ получен, но не удалось сохранить в базу');
        setIsSubmitting(false);
      }

    } catch (e) {
      console.error("Ошибка вебхука:", e);
      setStatusMsg('❌ Ошибка связи с ИИ');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
      height: '100dvh', 
      display: 'flex', 
      flexDirection: 'column', 
      maxWidth: '800px', 
      margin: '0 auto', 
      width: '100%', 
      position: 'relative', 
      paddingBottom: window.innerWidth < 768 ? '10px' : '20px', 
      overflow: 'hidden',
      background: 'var(--bg-deep-blue)'
    }}>
      
      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: '#0f172a', borderRight: '1px solid var(--glass-border)', zIndex: 1001, display: 'flex', flexDirection: 'column', padding: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="logo-glow-container small">
                    <img src="/logo.png" alt="Logo" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'white' }}>UyVazifa</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>
                  <X size={24} />
                </button>
              </div>

              <button 
                onClick={startNewChat}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}
              >
                <Plus size={20} color="var(--accent-cyan)" />
                Новый чат
              </button>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', paddingLeft: '5px' }}>Недавние проверки</p>
                {chats.map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={() => selectChat(chat.id)}
                    style={{ 
                      padding: '12px', 
                      borderRadius: '10px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      background: currentChatId === chat.id ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                      color: currentChatId === chat.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      transition: '0.2s',
                      marginBottom: '4px'
                    }}
                    onMouseEnter={e => { if(currentChatId !== chat.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if(currentChatId !== chat.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <MessageSquare size={18} style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: currentChatId === chat.id ? 'var(--accent-cyan)' : 'white' }}>
                          {chat.classGroup} • {chat.subject}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {formatDate(chat.lastUpdated)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ClipboardList size={10} /> {chat.messageCount || 0}
                        </span>
                        {chat.lastGrade && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600, background: 'rgba(0, 242, 254, 0.1)', padding: '0 4px', borderRadius: '4px' }}>
                            {chat.lastGrade}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {chats.length === 0 && !isLoadingChats && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '20px' }}>Истории пока нет</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="chat-header" style={{ 
        padding: window.innerWidth < 768 ? '12px 16px' : '16px 32px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        borderBottom: '1px solid var(--glass-border)', 
        background: 'rgba(19, 24, 38, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 10 
      }}>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center' }}
        >
          <Menu size={22} />
        </button>
        <h1 style={{ fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem', fontWeight: 600, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <ClipboardList size={18} color="var(--accent-cyan)" />
          {currentChatId ? (chats.find(c => c.id === currentChatId)?.classGroup || 'Чат') : 'Новая проверка'}
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--accent-cyan)', background: 'rgba(0, 242, 254, 0.1)', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px', border: '1px solid rgba(0, 242, 254, 0.2)', verticalAlign: 'middle' }}>v0.1</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 242, 254, 0.1)', padding: '4px 10px', borderRadius: '100px', border: '1px solid rgba(0, 242, 254, 0.2)', flexShrink: 0 }}>
          <Star size={12} color="var(--accent-cyan)" fill="var(--accent-cyan)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {totalToday}
          </span>
        </div>
      </div>

      {/* Chat Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: window.innerWidth < 768 ? '12px' : '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {aiFeed.length === 0 && !isSubmitting && !currentChatId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(0, 242, 254, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <ClipboardList size={32} color="var(--accent-cyan)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--text-main)' }}>Чем я могу помочь?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '300px', margin: 0, lineHeight: 1.5 }}>
              Прикрепите фото работы по <b>Математике</b>, укажите класс и предмет, а затем нажмите отправить.
              <br/>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '8px', display: 'block' }}>* Другие предметы будут добавлены скоро</span>
            </p>
          </div>
        ) : (
          aiFeed.map((msg, idx) => (
            <motion.div key={msg.id || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* User message */}
              <div style={{ alignSelf: 'flex-end', background: 'var(--glass-bg)', padding: '12px 16px', borderRadius: '20px 20px 0 20px', border: '1px solid var(--glass-border)', maxWidth: '85%' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {msg.subject || 'Предмет'}, Класс {msg.classGroup || '?'}, {msg.student} <br/>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Задание {msg.taskNum}, Стр {msg.page || '?'}</span>
                </p>
                {msg.preview && (
                  <img src={msg.preview} alt="ДЗ" style={{ width: '100%', maxWidth: '200px', borderRadius: '12px', marginTop: '8px' }} />
                )}
              </div>
              
              {/* AI Response */}
              <div style={{ alignSelf: 'flex-start', maxWidth: '95%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div className="logo-glow-container small" style={{ width: '24px', height: '24px', borderRadius: '6px' }}>
                    <img src="/logo.png" alt="Logo" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>UyVazifa</span>
                </div>
                <AIHomeworkCheckerCard rawData={msg.aiResponse || msg.text} />
              </div>
            </motion.div>
          ))
        )}

        {(isSubmitting || (currentChatId && aiFeed.length === 0)) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: 'flex-start', maxWidth: '95%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div className="logo-glow-container small" style={{ width: '24px', height: '24px', borderRadius: '6px' }}>
                <img src="/logo.png" alt="Logo" />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                {isSubmitting ? 'UyVazifa думает...' : 'Загрузка...'}
              </span>
            </div>
            
            <div style={{ 
              background: 'rgba(15, 23, 42, 0.6)', 
              backdropFilter: 'blur(12px)', 
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '20px', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px 20px',
              width: '100%',
              maxWidth: '300px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }}
                  />
                ))}
              </div>
              <div style={{ height: '10px', width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <motion.div 
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, transparent, rgba(0, 242, 254, 0.2), transparent)', borderRadius: '4px' }}
                />
              </div>
              <div style={{ height: '10px', width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <motion.div 
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.2 }}
                  style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, transparent, rgba(0, 242, 254, 0.2), transparent)', borderRadius: '4px' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={feedBottomRef} />
      </div>

      {/* Bottom Gemini-like Input Bar */}
      <div style={{ padding: window.innerWidth < 768 ? '0 8px 10px 8px' : '0 16px 20px 16px', background: 'linear-gradient(transparent, var(--bg-deep-blue) 40%)' }}>
        
        {attemptedSubmit && !isFormValid && imageFiles.length === 0 && (
          <div style={{ textAlign: 'center', color: '#EF4444', fontSize: '0.8rem', marginBottom: '8px' }}>Пожалуйста, прикрепите фото</div>
        )}

        <div style={{ background: 'var(--glass-bg)', borderRadius: '24px', border: '1px solid var(--glass-border)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
          
          {/* Scrollable selects row */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <select 
              value={formData.subject} 
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              className="custom-select"
              style={{ flex: 1, minWidth: '100px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${attemptedSubmit && !formData.subject ? '#EF4444' : 'transparent'}`, borderRadius: '14px', padding: '10px 12px', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', appearance: 'none', cursor: 'pointer', textAlign: 'center' }}
            >
              <option value="" disabled>Предмет</option>
              <option value="Математика">Математика</option>
              <option value="Другие (скоро)" disabled>Другие предметы (скоро)</option>
            </select>

            <select 
              value={formData.classGroup} 
              onChange={e => setFormData({ ...formData, classGroup: e.target.value })}
              className="custom-select"
              style={{ flex: 1, minWidth: '80px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${attemptedSubmit && !formData.classGroup ? '#EF4444' : 'transparent'}`, borderRadius: '14px', padding: '10px 12px', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', appearance: 'none', cursor: 'pointer', textAlign: 'center' }}
            >
              <option value="" disabled>Класс</option>
              {classGroups.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={formData.student} 
              onChange={e => setFormData({ ...formData, student: e.target.value })}
              className="custom-select"
              style={{ flex: 1, minWidth: '100px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${attemptedSubmit && !formData.student ? '#EF4444' : 'transparent'}`, borderRadius: '14px', padding: '10px 12px', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', appearance: 'none', cursor: 'pointer', textAlign: 'center' }}
            >
              <option value="" disabled>Ученик</option>
              {students.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Action & Secondary Inputs Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                style={{ width: '42px', height: '42px', borderRadius: '14px', background: imageFiles.length > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: imageFiles.length > 0 ? '#10B981' : 'var(--text-main)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
              >
                {imagePreviews.length > 0 ? (
                  <img src={imagePreviews[0]} alt="p" style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover' }} />
                ) : (
                  <Plus size={24} />
                )}
              </button>

              <AnimatePresence>
                {showPhotoMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    style={{ position: 'absolute', bottom: '55px', left: 0, background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', minWidth: '160px' }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', borderRadius: '10px', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Camera size={18} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.9rem', color: 'white' }}>Снять фото</span>
                      <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handleImageUpload(e); setShowPhotoMenu(false); }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', borderRadius: '10px', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <ImageIcon size={18} color="var(--accent-violet)" />
                      <span style={{ fontSize: '0.9rem', color: 'white' }}>Из галереи</span>
                      <input type="file" accept="image/*" hidden onChange={(e) => { handleImageUpload(e); setShowPhotoMenu(false); }} />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '0 12px', border: `1px solid ${attemptedSubmit && !formData.taskNum ? '#EF4444' : 'transparent'}` }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '6px', fontWeight: 600 }}>№</span>
                <input type="number" placeholder="Зад." value={formData.taskNum} onChange={e => setFormData({ ...formData, taskNum: parseInt(e.target.value) || '' })} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }} />
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '0 12px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '6px', fontWeight: 600 }}>Стр</span>
                <input type="number" placeholder="Стр" value={formData.page} onChange={e => setFormData({ ...formData, page: parseInt(e.target.value) || '' })} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }} />
              </div>
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || (attemptedSubmit && !isFormValid)} 
              style={{ width: '42px', height: '42px', borderRadius: '50%', background: (isFormValid || !attemptedSubmit) ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}
            >
              {isSubmitting ? (
                 <Loader2 style={{ animation: 'spin 1.5s linear infinite' }} size={20} color="#000" />
              ) : (
                 <ClipboardList size={20} color="#000" />
              )}
            </button>
          </div>


        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

      <style>{`
        .custom-select {
          background-image: none !important;
        }
        .custom-select option {
          background: #0f172a;
          color: white;
          padding: 10px;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
