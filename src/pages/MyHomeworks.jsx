import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { Calendar, Users, Book, FileText, ChevronDown, ChevronRight, Loader2, Trash2, X, Clock, Award, TrendingUp } from 'lucide-react';
import AIHomeworkCheckerCard from '../components/AIHomeworkCheckerCard';

export default function MyHomeworks({ user }) {
  const [homeworks, setHomeworks] = useState(() => {
    if (!user) return {};
    try {
      const cached = localStorage.getItem(`edu_hw_cache_${user.uid}`);
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  });
  
  const [isLoading, setIsLoading] = useState(() => {
    if (!user) return true;
    try {
      return !localStorage.getItem(`edu_hw_cache_${user.uid}`);
    } catch { return true; }
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [openDates, setOpenDates] = useState({});
  const [openClasses, setOpenClasses] = useState({});
  const [openSubjects, setOpenSubjects] = useState({});
  const [selectedHw, setSelectedHw] = useState(null);

  // Calculate days since user registration
  const daysSinceRegistration = useMemo(() => {
    if (!user?.metadata?.creationTime) return 1;
    const created = new Date(user.metadata.creationTime);
    const now = new Date();
    return Math.max(1, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
  }, [user]);

  // Count total homeworks
  const totalHomeworks = useMemo(() => {
    let count = 0;
    Object.values(homeworks).forEach(dates => {
      Object.values(dates).forEach(classes => {
        Object.values(classes).forEach(subjects => {
          count += subjects.length;
        });
      });
    });
    return count;
  }, [homeworks]);

  // Count unique dates
  const totalDays = useMemo(() => Object.keys(homeworks).length, [homeworks]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'homeworks'),
      where('userId', '==', user.uid)
    );
    
    setIsSyncing(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const grouped = {};
      
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      docs.sort((a, b) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });

      docs.forEach(data => {
        const dStr = data.dateStr || 'Неизвестная дата';
        const cGrp = data.classGroup || 'Без класса';
        const subj = data.subject || 'Без предмета';

        if (!grouped[dStr]) grouped[dStr] = {};
        if (!grouped[dStr][cGrp]) grouped[dStr][cGrp] = {};
        if (!grouped[dStr][cGrp][subj]) grouped[dStr][cGrp][subj] = [];
        
        grouped[dStr][cGrp][subj].push(data);
      });
      
      setHomeworks(grouped);
      localStorage.setItem(`edu_hw_cache_${user.uid}`, JSON.stringify(grouped));
      
      const dates = Object.keys(grouped);
      if (dates.length > 0 && Object.keys(openDates).length === 0) {
        setOpenDates(prev => ({ ...prev, [dates[0]]: true }));
      }
      
      setIsLoading(false);
      setIsSyncing(false);
    }, (err) => {
      console.error("Ошибка при подписке на архив:", err);
      setIsLoading(false);
      setIsSyncing(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const toggleDate = (d) => setOpenDates(prev => ({ ...prev, [d]: !prev[d] }));
  const toggleClass = (d, c) => {
    const key = `${d}_${c}`;
    setOpenClasses(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleSubject = (d, c, s) => {
    const key = `${d}_${c}_${s}`;
    setOpenSubjects(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const handleDelete = async (hwId) => {
    if (!window.confirm("Вы уверены, что хотите удалить эту запись?")) return;
    try {
      await deleteDoc(doc(db, 'homeworks', hwId));
    } catch (err) {
      console.error("Ошибка удаления:", err);
      alert("Не удалось удалить запись.");
    }
  };

  // Bulk delete: all homeworks for a specific date
  const handleDeleteDate = async (date) => {
    const allIds = [];
    Object.values(homeworks[date]).forEach(classes => {
      Object.values(classes).forEach(subjects => {
        subjects.forEach(hw => allIds.push(hw.id));
      });
    });
    if (!window.confirm(`Удалить все ${allIds.length} работ за ${date}?`)) return;
    try {
      await Promise.all(allIds.map(id => deleteDoc(doc(db, 'homeworks', id))));
    } catch (err) {
      console.error("Ошибка массового удаления:", err);
      alert("Не удалось удалить некоторые записи.");
    }
  };

  // Bulk delete: all homeworks for a specific class on a specific date
  const handleDeleteClass = async (date, cls) => {
    const allIds = [];
    Object.values(homeworks[date][cls]).forEach(subjects => {
      subjects.forEach(hw => allIds.push(hw.id));
    });
    if (!window.confirm(`Удалить все ${allIds.length} работ класса ${cls} за ${date}?`)) return;
    try {
      await Promise.all(allIds.map(id => deleteDoc(doc(db, 'homeworks', id))));
    } catch (err) {
      console.error("Ошибка массового удаления:", err);
      alert("Не удалось удалить некоторые записи.");
    }
  };

  // Bulk delete: all homeworks for a specific subject in a class on a date
  const handleDeleteSubject = async (date, cls, subj) => {
    const allIds = homeworks[date][cls][subj].map(hw => hw.id);
    if (!window.confirm(`Удалить все ${allIds.length} работ по предмету "${subj}"?`)) return;
    try {
      await Promise.all(allIds.map(id => deleteDoc(doc(db, 'homeworks', id))));
    } catch (err) {
      console.error("Ошибка массового удаления:", err);
      alert("Не удалось удалить некоторые записи.");
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container" style={{ padding: '32px var(--content-padding-x, 48px)', maxWidth: '1540px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="page-title" style={{ fontSize: '3rem', marginBottom: '10px' }}>Мои ДЗ</h1>
        <p className="page-subtitle" style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '30px', maxWidth: '700px' }}>Архив проверенных работ, отсортированный по датам, классам и урокам.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15), var(--glass-bg))', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '12px 20px' }}>
            <Clock size={20} color="var(--accent-violet)" />
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-violet)' }}>{daysSinceRegistration}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{daysSinceRegistration === 1 ? 'день' : daysSinceRegistration < 5 ? 'дня' : 'дней'} с нами</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '12px 20px' }}>
            <Award size={20} color="var(--accent-cyan)" />
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{totalHomeworks}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>всего проверок</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '12px 20px' }}>
            <TrendingUp size={20} color="#10B981" />
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>{totalDays}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>рабочих дней</span>
          </motion.div>
          {isSyncing && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '0.85rem' }}><Loader2 className="animate-spin" size={16} /> Обновление...</div>}
        </div>
      </div>

      <div style={{ width: '100%' }}>

        {/* Main Content */}
        <div style={{ minWidth: 0, width: '100%' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '30vh', color: 'var(--accent-cyan)' }}>
              <Loader2 className="animate-spin" size={40} style={{ marginBottom: '10px' }} />
              <p>Первая загрузка архива...</p>
            </div>
          ) : Object.keys(homeworks).length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ margin: '0 auto 20px', opacity: 0.5 }} />
              <h2>Архив пуст</h2>
              <p>Вы пока не проверили ни одной работы. Все ответы ИИ появятся здесь автоматически.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', justifyItems: 'center', width: '100%' }}>
              {Object.keys(homeworks).map((date) => (
                <div key={date} style={{ width: '100%', maxWidth: '500px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button 
                      onClick={() => toggleDate(date)}
                      style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: openDates[date] ? 'rgba(0, 242, 254, 0.08)' : 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'center', transition: '0.3s' }}
                    >
                      <Calendar size={32} color="var(--accent-violet)" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{date}</span>
                        <ChevronRight size={20} style={{ transform: openDates[date] ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.3s', opacity: 0.6 }} color="var(--text-muted)" />
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteDate(date); }}
                      title={`Удалить все за ${date}`}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.4)', cursor: 'pointer', padding: '12px', marginRight: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(239,68,68,0.4)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {openDates[date] && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '0 16px 20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {Object.keys(homeworks[date]).map(cls => (
                            <div key={cls} style={{ border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <button 
                                  onClick={() => toggleClass(date, cls)}
                                  style={{ flex: 1, padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' }}
                                >
                                  <ChevronRight size={18} style={{ transform: openClasses[`${date}_${cls}`] ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} color="var(--accent-cyan)" />
                                  <Users size={20} color="var(--accent-cyan)" />
                                  <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>Класс {cls}</span>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteClass(date, cls); }}
                                  title={`Удалить все работы класса ${cls}`}
                                  style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.35)', cursor: 'pointer', padding: '8px', marginRight: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(239,68,68,0.35)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>

                              <AnimatePresence>
                                {openClasses[`${date}_${cls}`] && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                    <div style={{ padding: '0 15px 15px 40px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {Object.keys(homeworks[date][cls]).map(subj => (
                                        <div key={subj} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <button 
                                              onClick={() => toggleSubject(date, cls, subj)}
                                              style={{ flex: 1, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' }}
                                            >
                                              <ChevronDown size={16} style={{ transform: openSubjects[`${date}_${cls}_${subj}`] ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} color="var(--text-muted)" />
                                              <Book size={18} color="var(--text-main)" />
                                              <span>{subj}</span>
                                              <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                                {homeworks[date][cls][subj].length} работ
                                              </span>
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeleteSubject(date, cls, subj); }}
                                              title={`Удалить все по "${subj}"`}
                                              style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.3)', cursor: 'pointer', padding: '6px', marginRight: '10px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                                              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'transparent'; }}
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>

                                          <AnimatePresence>
                                            {openSubjects[`${date}_${cls}_${subj}`] && (
                                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                                <div 
                                                  className="custom-scrollbar" 
                                                  style={{ 
                                                    padding: '12px', 
                                                    display: 'grid', 
                                                    gridTemplateColumns: '1fr', 
                                                    gap: '8px', 
                                                    maxHeight: '300px', 
                                                    overflowY: 'auto',
                                                    background: 'rgba(0,0,0,0.1)'
                                                  }}
                                                >
                                                  {homeworks[date][cls][subj].map(hw => (
                                                    <div 
                                                      key={hw.id} 
                                                      onClick={() => setSelectedHw(hw)}
                                                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                                                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                                    >
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{hw.student}</span>
                                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Задание #{hw.taskNum}</span>
                                                            {hw.timestamp && (
                                                              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                <Clock size={10} />
                                                                {formatTime(hw.timestamp)}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(hw.id); }}
                                                        style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.5)', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', transition: '0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                                                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.5)'}
                                                      >
                                                        <Trash2 size={14} />
                                                      </button>
                                                    </div>
                                                  ))}
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>{/* end wrapper */}
      
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
                background: 'var(--bg-main)', border: '1px solid var(--glass-border)',
                borderRadius: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
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
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <X size={18} />
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
