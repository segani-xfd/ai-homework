import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { Calendar, Users, Book, FileText, ChevronDown, ChevronRight, Loader2, Trash2, X, Clock, Award, TrendingUp } from 'lucide-react';
import AIHomeworkCheckerCard from '../components/AIHomeworkCheckerCard';

export default function MyHomeworks({ user }) {
  const [homeworks, setHomeworks] = useState(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`edu_hw_cache_flat_${user.uid}`);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  
  const [openSections, setOpenSections] = useState({});
  
  const [isLoading, setIsLoading] = useState(() => {
    if (!user) return true;
    try {
      return !localStorage.getItem(`edu_hw_cache_flat_${user.uid}`);
    } catch { return true; }
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedHw, setSelectedHw] = useState(null);

  // Calculate days since user registration
  const daysSinceRegistration = useMemo(() => {
    if (!user?.metadata?.creationTime) return 1;
    const created = new Date(user.metadata.creationTime);
    const now = new Date();
    return Math.max(1, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
  }, [user]);

  // Count total homeworks
  const totalHomeworks = homeworks.length;

  // Group homeworks by Date -> Class -> Subject
  const groupedData = useMemo(() => {
    const grouped = {};
    homeworks.forEach(hw => {
      const d = hw.dateStr || 'Без даты';
      const c = hw.classGroup || 'Без класса';
      const s = hw.subject || 'Без предмета';
      if (!grouped[d]) grouped[d] = {};
      if (!grouped[d][c]) grouped[d][c] = {};
      if (!grouped[d][c][s]) grouped[d][c][s] = [];
      grouped[d][c][s].push(hw);
    });
    return grouped;
  }, [homeworks]);

  const totalDays = Object.keys(groupedData).length;

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'homeworks'),
      where('userId', '==', user.uid)
    );
    
    setIsSyncing(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      docs.sort((a, b) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });

      setHomeworks(docs);
      localStorage.setItem(`edu_hw_cache_flat_${user.uid}`, JSON.stringify(docs));
      
      setIsLoading(false);
      setIsSyncing(false);
    }, (err) => {
      console.error("Ошибка при подписке на архив:", err);
      setIsLoading(false);
      setIsSyncing(false);
    });
    
    return () => unsubscribe();
  }, [user]);
  
  const handleDelete = async (hwId) => {
    if (!window.confirm("Вы уверены, что хотите удалить эту запись?")) return;
    try {
      await deleteDoc(doc(db, 'homeworks', hwId));
    } catch (err) {
      console.error("Ошибка удаления:", err);
      alert("Не удалось удалить запись.");
    }
  };



  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    if (!timestamp?.seconds) return '';
    const d = new Date(timestamp.seconds * 1000);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const sideCardStyle = {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(20px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '20px',
    padding: '24px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  };

  // Extract grade helper
  const getGrade = (text) => {
    if (!text) return "?";
    const m = text.match(/ОЦЕНКА:\s*([^\n]+)/i);
    return m ? m[1].trim() : "Анализ...";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container" style={{ padding: '24px 20px 100px 20px', maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Мои ДЗ</h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0 }}>История проверенных домашних заданий и статистика.</p>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1, background: 'var(--glass-bg)', borderRadius: '24px', padding: '20px 12px', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#8B5CF6' }}>{daysSinceRegistration}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px', fontWeight: 600 }}>Дней с нами</div>
        </div>
        <div style={{ flex: 1, background: 'var(--glass-bg)', borderRadius: '24px', padding: '20px 12px', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#8B5CF6' }}>{totalHomeworks}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px', fontWeight: 600 }}>Всего проверок</div>
        </div>
        <div style={{ flex: 1, background: 'var(--glass-bg)', borderRadius: '24px', padding: '20px 12px', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#8B5CF6' }}>{totalDays}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px', fontWeight: 600 }}>Рабочих дней</div>
        </div>
      </div>

      <div style={{ width: '100%' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '30vh', color: 'var(--accent-cyan)' }}>
            <Loader2 className="animate-spin" size={40} style={{ marginBottom: '10px' }} />
          </div>
        ) : homeworks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--glass-bg)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
            <FileText size={40} style={{ margin: '0 auto 16px', color: 'var(--text-muted)', opacity: 0.5 }} />
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>Архив пуст. Проверенные работы появятся здесь.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(groupedData).map(([date, classes]) => (
              <div key={date} style={{ background: 'var(--glass-bg)', borderRadius: '24px', padding: '20px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{date}</h3>
                  <Calendar size={20} color="var(--text-muted)" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(classes).map(([cls, subjects]) => (
                    Object.entries(subjects).map(([subj, items]) => {
                      const key = `${date}_${cls}_${subj}`;
                      const isOpen = openSections[key];
                      return (
                        <div key={key} style={{ background: 'var(--bg-deep-blue)', borderRadius: '16px', padding: '16px', border: '1px solid var(--glass-border)' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleSection(key)}>
                              <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#8B5CF6', marginBottom: '8px' }}>Класс {cls}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Проверено: {items.length}</div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                <span style={{ background: '#8B5CF6', color: '#FFF', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>{subj}</span>
                                {isOpen ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
                              </div>
                           </div>

                           <AnimatePresence>
                             {isOpen && (
                               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {items.map(hw => (
                                      <div key={hw.id} onClick={() => setSelectedHw(hw)} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                        <div>
                                          <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 500 }}>{hw.student}</div>
                                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>Задание {hw.taskNum}</span>
                                            <span style={{ opacity: 0.5 }}>•</span>
                                            <Clock size={10} />
                                            <span>{formatTime(hw.timestamp)}</span>
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {getGrade(hw.aiResponse)}
                                          </div>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(hw.id); }}
                                            style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', padding: '4px' }}
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal for viewing AI Response */}
      <AnimatePresence>
        {selectedHw && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
            }}
            onClick={() => setSelectedHw(null)}
          >
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.95 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.4 }}
              style={{
                background: '#131826', // Solid background for maximum sharpness
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '24px', 
                width: '100%', 
                maxWidth: '800px', 
                maxHeight: '90vh',
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                transform: 'translateZ(0)',
                WebkitFontSmoothing: 'antialiased'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={20} color="var(--accent-cyan)" />
                  Ответ ИИ: {selectedHw.student}
                </h2>
                <button 
                  onClick={() => setSelectedHw(null)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    border: 'none', 
                    color: 'white', 
                    cursor: 'pointer', 
                    borderRadius: '50%', 
                    width: '36px', 
                    height: '36px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0,
                    transition: '0.2s' 
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="custom-scrollbar" style={{ padding: '20px', overflowY: 'auto' }}>
                <AIHomeworkCheckerCard rawData={selectedHw.aiResponse} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}
