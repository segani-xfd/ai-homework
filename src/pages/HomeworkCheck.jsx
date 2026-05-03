import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, X, Send, Eraser, AlertCircle, MessageSquare, Clock, CheckCircle, Zap, Award } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import AIHomeworkCheckerCard from '../components/AIHomeworkCheckerCard';

const WEBHOOK_URL = 'http://vmi3258336.contaboserver.net/webhook/check_hw';

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
  const [statusMsg, setStatusMsg] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Feed of AI responses (Read-only chat)
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

  // Count today's checks from Firestore
  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toLocaleDateString('ru-RU');
    const q = query(
      collection(db, 'homeworks'),
      where('userId', '==', user.uid),
      where('dateStr', '==', todayStr)
    );
    getDocs(q).then(snap => setTodayDbCount(snap.size)).catch(() => {});
  }, [user]);

  const todayCount = todayDbCount + aiFeed.length;

  const feedRef = useRef(null);

  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiFeed]);

  const resetForm = () => {
    setFormData({ classGroup: '', student: '', subject: '', taskNum: 1, page: 1 });
    setImagePreviews([]);
    setImageFiles([]);
    setStatusMsg('');
    setAttemptedSubmit(false);
    setAiFeed([]);
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
    setStatusMsg('ИИ анализирует фото...');

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

      const feedItem = {
        student: formData.student,
        taskNum: formData.taskNum,
        text: finalAiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAiFeed(prev => [...prev, feedItem]);

      setStatusMsg('✅ Ответ получен!');
      setIsSubmitting(false);

      try {
        const currentDateStr = new Date().toLocaleDateString('ru-RU');
        await addDoc(collection(db, 'homeworks'), {
          userId: user.uid,
          dateStr: currentDateStr,
          classGroup: formData.classGroup,
          subject: formData.subject,
          student: formData.student,
          taskNum: formData.taskNum,
          aiResponse: finalAiText,
          timestamp: serverTimestamp()
        });
        setStatusMsg('✅ Проверено и сохранено в Архив');
        clearPhotoOnly();
      } catch (dbError) {
        console.error("Ошибка сохранения в базу:", dbError);
        setStatusMsg('⚠️ Ответ получен, но не удалось сохранить в базу');
      }

    } catch (e) {
      console.error("Ошибка вебхука:", e);
      setStatusMsg('❌ Ошибка связи с ИИ');
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container" style={{ padding: '32px var(--content-padding-x, 48px)', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden', maxWidth: '1540px', margin: '0 auto', width: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 className="page-title">Проверка дз</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Загрузите данные. Ответы ИИ автоматически сохраняются в Архив.</p>
        </div>
        <button className="btn-secondary" onClick={resetForm} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Eraser size={18} /> Сбросить всё
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 340px', gap: '24px', flexGrow: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* COL 1: Left Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignSelf: 'start' }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} style={{ background: 'linear-gradient(135deg, rgba(0,242,254,0.12), var(--glass-bg))', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={24} color="var(--accent-cyan)" />
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1 }}>{todayCount}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.3 }}>проверок сегодня</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Zap size={24} color="var(--accent-violet)" />
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-violet)', lineHeight: 1 }}>{aiFeed.length}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.3 }}>в сессии</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }} style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Clock size={24} color="#10B981" />
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#10B981', lineHeight: 1.2 }}>{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.3 }}>сегодня</span>
          </motion.div>
        </div>

        {/* COL 2: AI Feed (widest) */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '20px', minHeight: 0 }}>
          <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, borderRadius: '20px 20px 0 0' }}>
            <MessageSquare size={20} color="var(--accent-cyan)" />
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.15rem' }}>Лента Ответов ИИ</h3>
          </div>
          <div ref={feedRef} className="custom-scrollbar" style={{ flex: 1, padding: '48px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px', minHeight: 0 }}>
            {aiFeed.length === 0 && !isSubmitting ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <p>Лента пуста. Загрузите ДЗ для начала проверки.</p>
              </div>
            ) : (
              <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {aiFeed.map((msg, i) => (
                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }} key={i} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#a855f7', fontWeight: '500' }}>{msg.time}</span>
                    </div>
                    <AIHomeworkCheckerCard rawData={msg.text} />
                  </motion.div>
                ))}
                {isSubmitting && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: [0.5, 1, 0.5], y: 0 }} transition={{ opacity: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }, y: { duration: 0.3 } }} style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', flexShrink: 0 }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: '#cbd5e1', fontSize: '16px', fontWeight: '500', letterSpacing: '0.05em' }}>ИИ анализирует домашнее задание...</span>
                  </motion.div>
                )}
              </motion.div>
            )}
            <div ref={feedBottomRef} />
          </div>
          <div style={{ padding: '14px 28px', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.15)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', flexShrink: 0, borderRadius: '0 0 20px 20px' }}>
            Ответы записываются автоматически в "Мои ДЗ"
          </div>
        </div>

        {/* COL 3: Upload Form & Info Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden', minHeight: 0 }}>
          <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="glass-card custom-scrollbar" style={{ overflowY: 'auto', borderRadius: '20px', padding: '28px', flexShrink: 0 }}>
            <div className="input-group">
              <label className="input-label">Класс</label>
              <select className="form-input" value={formData.classGroup} onChange={e => setFormData({ ...formData, classGroup: e.target.value })} style={{ borderColor: attemptedSubmit && !formData.classGroup ? '#EF4444' : '' }}>
                <option value="" disabled>Выберите класс...</option>
                {classGroups.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {attemptedSubmit && !formData.classGroup && <p style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '4px' }}>Выберите класс</p>}
            </div>
            <div className="input-group">
              <label className="input-label">Имя ученика</label>
              <select className="form-input" value={formData.student} onChange={e => setFormData({ ...formData, student: e.target.value })} style={{ borderColor: attemptedSubmit && !formData.student ? '#EF4444' : '' }}>
                <option value="" disabled>Выберите ученика...</option>
                {students.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {attemptedSubmit && !formData.student && <p style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '4px' }}>Выберите ученика</p>}
            </div>
            <div className="input-group">
              <label className="input-label">Предмет</label>
              <select className="form-input" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} style={{ borderColor: attemptedSubmit && !formData.subject ? '#EF4444' : '' }}>
                <option value="" disabled>Выберите предмет...</option>
                <option value="Математика">Математика</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Номер задания</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="number" min="1" max="9999" className="form-input" value={formData.taskNum} onChange={e => { const v = parseInt(e.target.value) || 1; setFormData({ ...formData, taskNum: Math.min(9999, Math.max(1, v)) }); }} onInput={e => { if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4); }} style={{ flex: 1, borderColor: attemptedSubmit && !formData.taskNum ? '#EF4444' : '' }} />
                <button type="button" onClick={() => setFormData({ ...formData, taskNum: Math.min(9999, formData.taskNum + 1) })} className="btn-secondary" style={{ padding: '0 15px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }} title="Следующее задание">+1</button>
              </div>
              {attemptedSubmit && !formData.taskNum && <p style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '4px' }}>Укажите номер задания</p>}
            </div>
            <div className="input-group">
              <label className="input-label">Страница</label>
              <input type="number" min="1" max="9999" className="form-input" placeholder="Введите страницу" value={formData.page} onChange={e => { const v = e.target.value; if (v === '') { setFormData({ ...formData, page: '' }); return; } const num = parseInt(v) || 1; setFormData({ ...formData, page: Math.min(9999, Math.max(1, num)) }); }} onInput={e => { if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4); }} style={{ borderColor: attemptedSubmit && !formData.page ? '#EF4444' : '' }} />
              {attemptedSubmit && !formData.page && <p style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '4px' }}>Укажите страницу</p>}
            </div>

            <motion.div className="input-group" style={{ marginTop: '24px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <label className="input-label" style={{ textAlign: 'center', color: 'var(--accent-cyan)' }}>Фото задания (1:1)</label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '120px', height: '120px' }}>
                    <img src={preview} style={{ width: '100%', height: '100%', borderRadius: '16px', border: '2px solid var(--accent-cyan)', objectFit: 'cover' }} alt="Preview" />
                    {!isSubmitting && (
                      <button onClick={() => { setImagePreviews(prev => prev.filter((_, i) => i !== idx)); setImageFiles(prev => prev.filter((_, i) => i !== idx)); }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {imagePreviews.length === 0 && (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '120px', height: '120px', border: `2px dashed ${attemptedSubmit && imageFiles.length === 0 ? '#EF4444' : 'var(--glass-border)'}`, borderRadius: '16px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', transition: '0.3s' }}>
                    {isSubmitting ? (
                      <div style={{ width: '24px', height: '24px', border: '2px solid var(--glass-border)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        <ImagePlus size={24} color="var(--accent-cyan)" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '5px' }}>Добавить</span>
                      </>
                    )}
                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} disabled={isSubmitting} />
                  </label>
                )}
              </div>
              {attemptedSubmit && imageFiles.length === 0 && <p style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '8px', textAlign: 'center' }}>Загрузите хотя бы одно фото</p>}
            </motion.div>

            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button className="btn-primary" style={{ width: '100%', opacity: (!isFormValid && attemptedSubmit) ? 0.7 : 1 }} onClick={handleSubmit} disabled={isSubmitting || (attemptedSubmit && !isFormValid)}>
                {isSubmitting ? 'Проверка ИИ...' : <><Send size={18} /> Отправить на проверку</>}
              </button>
              {statusMsg && <p style={{ marginTop: '15px', color: statusMsg.includes('Успешно') ? '#10B981' : 'var(--accent-cyan)', fontSize: '0.9rem' }}>{statusMsg}</p>}
            </div>
          </motion.div>


        </div>

      </div>
    </motion.div>
  );
}
