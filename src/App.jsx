import React, { useState, useEffect } from 'react';
import { Home, ListChecks, Users, LogOut, FolderOpen, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import HomeTab from './pages/Home';
import HomeworkCheckTab from './pages/HomeworkCheck';

import PersonalizationTab from './pages/Personalization';
import AuthModal from './components/AuthModal';
import MyHomeworksTab from './pages/MyHomeworks';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login' });
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { id: 'home', label: 'Главная', icon: Home, requiresAuth: false },
    { id: 'homeworkCheck', label: 'Проверка ДЗ', icon: ListChecks, requiresAuth: true },
    { id: 'myHomeworks', label: 'Мои ДЗ', icon: FolderOpen, requiresAuth: true },
    { id: 'personalization', label: 'Профиль', icon: User, requiresAuth: true },
  ];

  const handleTabSwitch = (itemOrId) => {
    let item = typeof itemOrId === 'string' ? navItems.find(i => i.id === itemOrId) : itemOrId;
    if (item.requiresAuth && !user) {
      setAuthModal({ isOpen: true, mode: 'login' });
      return;
    }
    setActiveTab(item.id);
  };

  const handleSignOut = () => {
    signOut(auth);
    setActiveTab('home');
  };

  if (isInitializing) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Загрузка...</div>;

  return (
    <>
      <div className="bg-blobs">
        <div className="blob blob-cyan"></div>
        <div className="blob blob-violet"></div>
      </div>
      
      <div className="app-layout">
        <header className="top-nav">
          <div className="brand" style={{ cursor: 'pointer' }} onClick={() => handleTabSwitch('home')}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo.png" alt="" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>UyVazifa</span>
          </div>
          
          <nav className="nav-links">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <motion.button 
                  key={item.id}
                  onClick={() => handleTabSwitch(item)}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="nav-icon" size={16} />
                  {item.label}
                  {activeTab === item.id && (
                    <motion.div 
                      layoutId="activeTabIndicator"
                      style={{ 
                        position: 'absolute', 
                        bottom: -1, 
                        left: '10%', 
                        width: '80%', 
                        height: '2px', 
                        background: 'var(--accent-cyan)', 
                        borderRadius: '2px 2px 0 0' 
                      }} 
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>

          <div className="user-section">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '0.85rem' }}>{user.displayName || 'Учитель'}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{user.email}</span>
                </div>
                <button onClick={handleSignOut} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} title="Выйти" onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}>
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: '0.9rem' }} onClick={() => setAuthModal({ isOpen: true, mode: 'login' })}>Вход</button>
                <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.9rem' }} onClick={() => setAuthModal({ isOpen: true, mode: 'register' })}>Регистрация</button>
              </div>
            )}
          </div>
        </header>

        <main className={`main-content ${activeTab === 'homeworkCheck' ? 'no-scroll' : ''}`} style={{ position: 'relative' }}>
          {/* Fade transition wrapper for each tab */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: activeTab === 'home' ? 1 : 0,
              y: activeTab === 'home' ? 0 : 10,
              pointerEvents: activeTab === 'home' ? 'auto' : 'none'
            }}
            transition={{ duration: 0.4 }}
            style={{ display: activeTab === 'home' ? 'block' : 'none', width: '100%' }}
          >
            <HomeTab navigateTo={handleTabSwitch} />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: activeTab === 'homeworkCheck' ? 1 : 0,
              y: activeTab === 'homeworkCheck' ? 0 : 10,
              pointerEvents: activeTab === 'homeworkCheck' ? 'auto' : 'none'
            }}
            transition={{ duration: 0.4 }}
            style={{ display: activeTab === 'homeworkCheck' ? 'flex' : 'none', height: '100%', flexDirection: 'column', width: '100%' }}
          >
            <HomeworkCheckTab user={user} />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: activeTab === 'myHomeworks' ? 1 : 0,
              y: activeTab === 'myHomeworks' ? 0 : 10,
              pointerEvents: activeTab === 'myHomeworks' ? 'auto' : 'none'
            }}
            transition={{ duration: 0.4 }}
            style={{ display: activeTab === 'myHomeworks' ? 'flex' : 'none', height: '100%', flexDirection: 'column', width: '100%' }}
          >
            <MyHomeworksTab user={user} />
          </motion.div>



          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: activeTab === 'personalization' ? 1 : 0,
              y: activeTab === 'personalization' ? 0 : 10,
              pointerEvents: activeTab === 'personalization' ? 'auto' : 'none'
            }}
            transition={{ duration: 0.4 }}
            style={{ display: activeTab === 'personalization' ? 'block' : 'none', width: '100%' }}
          >
            <PersonalizationTab user={user} handleSignOut={handleSignOut} />
          </motion.div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button 
                key={item.id}
                onClick={() => handleTabSwitch(item)}
                className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <div className="mobile-nav-icon-wrapper">
                  <Icon size={20} />
                </div>
                <span className="mobile-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <AuthModal 
        isOpen={authModal.isOpen} 
        initialMode={authModal.mode} 
        onClose={() => setAuthModal({ ...authModal, isOpen: false })} 
      />
    </>
  );
}

export default App;
