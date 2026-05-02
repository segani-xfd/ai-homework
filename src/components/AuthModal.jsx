import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else {
        if (!fullName.trim()) throw new Error('Пожалуйста, введите ФИО');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await updateProfile(userCredential.user, { displayName: fullName });
        
        // Initialize user document in Firestore to hold their student lists
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          displayName: fullName,
          email: email,
          students: [],
          classes: [],
          createdAt: new Date().toISOString()
        });
        
        onClose();
      }
    } catch (err) {
      console.error("Auth/Firestore Error:", err);
      let msg = err.message || 'Произошла ошибка. Попробуйте еще раз.';
      
      if (err.code === 'auth/invalid-credential') msg = 'Неверный email или пароль.';
      if (err.code === 'auth/user-not-found') msg = 'Пользователь не найден.';
      if (err.code === 'auth/wrong-password') msg = 'Неверный пароль.';
      if (err.code === 'auth/email-already-in-use') msg = 'Этот email уже используется.';
      if (err.code === 'auth/weak-password') msg = 'Пароль должен содержать не менее 6 символов.';
      
      setError(err.message === 'Пожалуйста, введите ФИО' ? err.message : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="glass-card flex flex-col"
            style={{ width: '100%', maxWidth: '400px', position: 'relative' }}
          >
            <button 
              onClick={onClose}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ fontSize: '1.8rem', marginBottom: '10px', textAlign: 'center', color: 'var(--text-main)' }}>
              {mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px' }}>
              {mode === 'login' ? 'Войдите в систему EduAI.' : 'Начните использовать ИИ для образования.'}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {mode === 'register' && (
                <div style={{ position: 'relative' }}>
                  <User size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" className="form-input" placeholder="Ваше ФИО" 
                    value={fullName} onChange={e => setFullName(e.target.value)} required 
                    style={{ paddingLeft: '45px' }}
                  />
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" className="form-input" placeholder="Email" 
                  value={email} onChange={e => setEmail(e.target.value)} required 
                  style={{ paddingLeft: '45px' }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" className="form-input" placeholder="Пароль" 
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  style={{ paddingLeft: '45px' }}
                />
              </div>

              {error && <p style={{ color: '#EF4444', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                {loading ? 'Загрузка...' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button 
                type="button" 
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
