import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, ShieldCheck, Loader2, Users, UserCircle, Edit3, Save, X, LogOut } from 'lucide-react';
import { db, auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';

export default function Personalization({ user, handleSignOut }) {
  // Students
  const [students, setStudents] = useState(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`edu_students_${user.uid}`);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  
  // Classes
  const [classGroups, setClassGroups] = useState(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`edu_classes_${user.uid}`);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const [newStudent, setNewStudent] = useState('');
  const [newClass, setNewClass] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');

  useEffect(() => {
    if (user) {
      setEditName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setIsSyncing(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          const fetchedStudents = data.students || [];
          const fetchedClasses = data.classes || [];
          setStudents(fetchedStudents);
          setClassGroups(fetchedClasses);
          localStorage.setItem(`edu_students_${user.uid}`, JSON.stringify(fetchedStudents));
          localStorage.setItem(`edu_classes_${user.uid}`, JSON.stringify(fetchedClasses));
        } else {
          await setDoc(userRef, { students: [], classes: [], email: user.email }, { merge: true });
        }
      } catch (err) {
        console.error("Ошибка при загрузке:", err);
      } finally {
        setIsSyncing(false);
      }
    };
    fetchData();
  }, [user]);

  // Student methods
  const handleAddStudent = () => {
    const name = newStudent.trim();
    if (!name || !user) return;
    if (students.includes(name)) { alert("Этот ученик уже добавлен."); return; }
    
    const newStudentsList = [...students, name];
    setStudents(newStudentsList);
    setNewStudent('');
    localStorage.setItem(`edu_students_${user.uid}`, JSON.stringify(newStudentsList));

    setIsSyncing(true);
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, { students: arrayUnion(name) }).catch(async (err) => {
      if (err.code === 'not-found') await setDoc(userRef, { students: arrayUnion(name) }, { merge: true });
    }).finally(() => setIsSyncing(false));
  };

  const handleRemoveStudent = (name) => {
    if (!user) return;
    const newStudentsList = students.filter(s => s !== name);
    setStudents(newStudentsList);
    localStorage.setItem(`edu_students_${user.uid}`, JSON.stringify(newStudentsList));

    setIsSyncing(true);
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, { students: arrayRemove(name) }).finally(() => setIsSyncing(false));
  };

  // Class methods
  const handleAddClass = () => {
    const cls = newClass.trim();
    if (!cls || !user) return;
    if (classGroups.includes(cls)) { alert("Этот класс уже добавлен."); return; }
    
    const newList = [...classGroups, cls];
    setClassGroups(newList);
    setNewClass('');
    localStorage.setItem(`edu_classes_${user.uid}`, JSON.stringify(newList));

    setIsSyncing(true);
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, { classes: arrayUnion(cls) }).catch(async (err) => {
      if (err.code === 'not-found') await setDoc(userRef, { classes: arrayUnion(cls) }, { merge: true });
    }).finally(() => setIsSyncing(false));
  };

  const handleRemoveClass = (cls) => {
    if (!user) return;
    const newList = classGroups.filter(c => c !== cls);
    setClassGroups(newList);
    localStorage.setItem(`edu_classes_${user.uid}`, JSON.stringify(newList));

    setIsSyncing(true);
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, { classes: arrayRemove(cls) }).finally(() => setIsSyncing(false));
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setIsSyncing(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: editName.trim()
      });
      // Optionally update Firestore too if you store name there
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { displayName: editName.trim() }).catch(() => {});
      
      setIsEditingProfile(false);
      alert("Профиль обновлен!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Ошибка при обновлении профиля.");
    } finally {
      setIsSyncing(false);
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container" style={{ padding: '32px var(--content-padding-x, 48px)', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Персонализация</h1>
          <p className="page-subtitle">Управляйте вашим классом и настройками аккаунта.</p>
        </div>
        {isSyncing && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '0.9rem' }}><Loader2 className="animate-spin" size={16} /> Синхронизация...</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '20px' }}>
        
        {/* Classes Manager */}
        <div className="glass-card" style={{ alignSelf: 'start' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="var(--accent-violet)" /> Возможные классы
          </h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Например: 9Б, 2А"
              value={newClass}
              onChange={e => setNewClass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddClass()}
            />
            <button className="btn-primary" onClick={handleAddClass}>
              Добавить
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {classGroups.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Классы пока не добавлены.</p>
            ) : (
              classGroups.map(cls => (
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={cls} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span>{cls}</span>
                  <button onClick={() => handleRemoveClass(cls)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Student Manager */}
        <div className="glass-card" style={{ alignSelf: 'start' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={24} color="var(--accent-cyan)" /> Список учеников
          </h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="ФИО ученика"
              value={newStudent}
              onChange={e => setNewStudent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
            />
            <button className="btn-primary" onClick={handleAddStudent}>
              Добавить
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {students.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Ученики пока не добавлены.</p>
            ) : (
              students.map(student => (
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={student} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span>{student}</span>
                  <button onClick={() => handleRemoveStudent(student)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Account Profile Block */}
        <div className="glass-card" style={{ alignSelf: 'start' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={24} color="var(--accent-violet)" /> Настройки
          </h2>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'white' }}>
                {user?.displayName ? user.displayName[0].toUpperCase() : <UserCircle size={32} />}
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Статус</p>
                <p style={{ fontWeight: '600', color: 'var(--accent-cyan)' }}>👨‍🏫 Учитель</p>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ФИО</p>
                {!isEditingProfile ? (
                  <button 
                    onClick={() => setIsEditingProfile(true)} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                  >
                    <Edit3 size={14} /> Изменить
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={handleUpdateProfile} 
                      style={{ background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer' }}
                      title="Сохранить"
                    >
                      <Save size={16} />
                    </button>
                    <button 
                      onClick={() => { setIsEditingProfile(false); setEditName(user?.displayName || ''); }} 
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                      title="Отмена"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              {isEditingProfile ? (
                <input 
                  type="text" 
                  className="form-input" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Введите ваше ФИО"
                  autoFocus
                />
              ) : (
                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{user?.displayName || 'Не указано'}</p>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Email</p>
              <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{user?.email}</p>
            </div>

            <button className="btn-secondary" style={{ width: '100%', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={handleSignOut}>
              <LogOut size={18} /> Выйти из аккаунта
            </button>
          </div>
        </div>

      </div>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}
