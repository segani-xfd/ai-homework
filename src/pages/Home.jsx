import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, GitCompare, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Quote, Zap, Eye, Shield } from 'lucide-react';
import ScrollSequence from '../components/ScrollSequence';

const revealVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
};

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ marginBottom: '15px', border: '1px solid var(--glass-border)', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left', fontSize: '1.1rem' }}
      >
        {question}
        <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} color="var(--accent-cyan)" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 20px 20px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const testimonials = [
  {
    name: 'Шукрона Ахмадовна',
    role: 'учитель математики',
    text: '«Сначала я скептически хмыкнула: какой еще интеллект разберет каракули моих девятиклассников? Думала, поиграюсь день и удалю. Но когда система за полторы минуты нашла ошибку в дискриминанте, которую я сама проглядела из-за усталости... В этот вечер я впервые за месяц легла спать в 10 вечера».',
    color: 'var(--accent-cyan)',
  },
  {
    name: 'Алексей Абдулаевич',
    role: 'физика и информатика',
    text: '«Боялся, что ИИ будет просто подгонять под ответ. Но TaskLens реально показывает, где ребенок запутался в формулах. Это не "шпаргалка", это полноценный ассистент. Теперь проверка 25 работ занимает у меня полчаса вместо трех».',
    color: 'var(--accent-violet)',
  },
  {
    name: 'Саида Каримовна',
    role: 'начальные классы',
    text: '«Меня пугало слово "технологии". Думала, нужно будет полгода учиться. Оказалось — просто сфоткала и всё. Теперь я не трачу выходные на проверку контрольных, а провожу их с внуками. Это лучшее приобретение для школы за последние годы».',
    color: '#10B981',
  },
  {
    name: 'Дмитрий',
    role: 'молодой педагог, геометрия',
    text: '«Я думал, что ИИ — это просто хайп и он будет ошибаться на каждом шагу. Да, иногда он переспрашивает про почерк, но это честно. Он не врет. Зато как он сравнивает логику доказательства теоремы — это уровень хорошего методиста».',
    color: 'var(--accent-cyan)',
  },
  {
    name: 'Елена Павловна',
    role: 'химия',
    text: '«Самое ценное — это сравнение. Я сразу вижу: вот тут ученик перепутал валентность, а вот как должно быть. Не нужно держать в голове все эталоны. TaskLens освободил мне время для подготовки к интересным опытам, а не для копания в черновиках».',
    color: 'var(--accent-violet)',
  },
];

const TestimonialCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent(prev => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  };

  const prev = () => {
    setDirection(-1);
    setCurrent((current - 1 + testimonials.length) % testimonials.length);
  };

  const next = () => {
    setDirection(1);
    setCurrent((current + 1) % testimonials.length);
  };

  const t = testimonials[current];

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto', minHeight: '280px' }}>
      <button
        onClick={prev}
        style={{
          position: 'absolute', left: '-60px', top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
          borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s', zIndex: 2
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        style={{
          position: 'absolute', right: '-60px', top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
          borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s', zIndex: 2
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <ChevronRight size={20} />
      </button>

      <div style={{ overflow: 'hidden', borderRadius: '24px' }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)', borderRadius: '24px',
              padding: '40px', position: 'relative'
            }}
          >
            <Quote size={40} color={t.color} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '24px', fontStyle: 'italic' }}>
              {t.text}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${t.color}, rgba(255,255,255,0.1))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 700, color: 'white'
              }}>
                {t.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{t.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.role}</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === current ? '28px' : '10px', height: '10px',
              borderRadius: '99px', border: 'none', cursor: 'pointer', transition: '0.3s',
              background: i === current ? testimonials[i].color : 'rgba(255,255,255,0.15)'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default function Home({ navigateTo }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <div className="home-scrollytelling" style={{ paddingBottom: '120px', position: 'relative' }}>
      
      <div 
        style={{ position: 'absolute', top: '10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(108, 92, 231, 0.15) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: -1, animation: 'float 20s infinite alternate linear' }} 
      />
      <div 
        style={{ position: 'absolute', top: '50%', left: '-20%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(0, 242, 254, 0.1) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: -1, animation: 'float 15s infinite alternate-reverse linear' }} 
      />

      <motion.section 
        initial="hidden" animate="visible"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center', 
          padding: '40px 20px',
          maxWidth: '900px',
          margin: '0 auto',
          marginBottom: '20px' // Сократил отступ перед анимацией
        }}
      >
        <motion.h1 
          variants={revealVariants} 
          className="page-title" 
          style={{ 
            fontSize: '4.5rem', // Сделал крупнее
            fontWeight: '800',  // Сделал максимально жирным
            lineHeight: '1.1', 
            marginBottom: '24px' 
          }}
        >
          Верните себе право на <br/>
          <span style={{ 
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            вечер без тетрадей
          </span>
        </motion.h1>
        
        <motion.p 
          variants={revealVariants} 
          className="page-subtitle" 
          style={{ 
            fontSize: '1.4rem', // Увеличил размер шрифта подзаголовка
            lineHeight: '1.5',
            color: 'var(--text-muted)',
            margin: 0 
          }}
        >
          Мы создали TaskLens не для того, чтобы заменить ваш опыт, а чтобы стать вашими «вторыми глазами». Пока вы отдыхаете, наш ИИ готовит для вас детальный разбор каждой задачи.
        </motion.p>
      </motion.section>

      {/* Animation Section */}
      <section style={{ marginBottom: '120px' }}>
        <ScrollSequence frameCount={200} />
      </section>

      {/* Как это работает (3-Step Guide) */}
      <motion.section 
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
        variants={containerVariants}
        style={{ maxWidth: '1100px', margin: '0 auto 120px', padding: '0 20px' }}
      >
        <motion.h2 variants={itemVariants} style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '16px' }}>Как это работает</motion.h2>
        <motion.p variants={itemVariants} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.15rem', marginBottom: '60px' }}>Без магии, только логика</motion.p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          {[
            { step: '1', icon: Camera, title: 'Мгновенный захват', text: 'Просто сфотографируйте работу ученика. TaskLens понимает рукописный текст.', color: 'var(--accent-cyan)' },
            { step: '2', icon: GitCompare, title: 'Интеллектуальное сравнение', text: 'Алгоритм сопоставляет решение ученика с эталоном. Система находит место, где логика «свернула не туда», и подсвечивает конкретную ошибку. ~1.5 минуты.', color: 'var(--accent-violet)' },
            { step: '3', icon: CheckSquare, title: 'Прозрачный результат', text: 'Вы получаете два чётких блока: «Решение ученика с ошибками» против «Правильного пути». Вам остаётся только взглянуть и подтвердить оценку.', color: 'var(--accent-cyan)' }
          ].map((item, i) => (
            <motion.div key={i} variants={itemVariants} className="glass-card" style={{ textAlign: 'center', position: 'relative', paddingTop: '50px' }}>
              <div 
                className={i % 2 === 0 ? "neon-glow-cyan" : "neon-glow-violet"}
                style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-darker)', border: `2px solid ${item.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}
              >
                <item.icon size={24} />
              </div>
              <h3 style={{ fontSize: '1.6rem', marginBottom: '15px', color: 'var(--text-main)' }}>{item.title}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{item.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Почему учителя выбирают TaskLens */}
      <motion.section 
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
        variants={containerVariants}
        style={{ maxWidth: '1100px', margin: '0 auto 120px', padding: '0 20px' }}
      >
        <motion.h2 variants={itemVariants} style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '60px' }}>Почему учителя выбирают TaskLens?</motion.h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: 'auto', gap: '20px' }}>
          <motion.div variants={itemVariants} className="glass-card" style={{ gridColumn: 'span 6', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.1), transparent)', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap size={28} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '1.5rem', color: 'var(--accent-cyan)', margin: 0 }}>Честная скорость</h4>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0, lineHeight: '1.6' }}>Детальная проверка одной сложной работы занимает около 1.5 минут — это в 5–7 раз быстрее, чем вглядываться в почерк вручную.</p>
          </motion.div>
          <motion.div variants={itemVariants} className="glass-card" style={{ gridColumn: 'span 6', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid rgba(108, 92, 231, 0.3)', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Eye size={28} color="var(--accent-violet)" />
              <h4 style={{ fontSize: '1.5rem', color: 'var(--accent-violet)', margin: 0 }}>Фокус на главном</h4>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0, lineHeight: '1.6' }}>Вы не тратите силы на поиск описок, а сразу видите, понял ли ученик тему.</p>
          </motion.div>
          <motion.div variants={itemVariants} className="glass-card" style={{ gridColumn: 'span 12', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: 'rgba(255,255,255,0.03)', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={28} color="#10B981" />
              <h4 style={{ fontSize: '1.5rem', color: '#10B981', margin: 0 }}>Объективность</h4>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0, lineHeight: '1.6', maxWidth: '700px' }}>ИИ не устаёт к 30-й тетради и проверяет последнюю работу так же внимательно, как и первую.</p>
          </motion.div>
        </div>
      </motion.section>

      {/* Ответы на главные опасения */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={containerVariants} style={{ maxWidth: '800px', margin: '0 auto 120px', padding: '0 20px' }}>
        <motion.h2 variants={itemVariants} style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '60px' }}>Ответы на главные опасения</motion.h2>
        <motion.div variants={itemVariants}>
          <FAQItem 
            question="«А если ИИ ошибётся сам?»"
            answer="Мы не скрываем: ИИ — это инструмент, а не истина в последней инстанции. Поэтому TaskLens не ставит оценку за вас. Он подсвечивает подозрительные моменты и указывает на логические нестыковки."
          />
          <FAQItem 
            question="«Это слишком сложно для меня»"
            answer="Если вы умеете пользоваться камерой телефона — вы уже эксперт в TaskLens. Никаких сложных настроек и лишних кнопок. Только фото и результат."
          />
        </motion.div>
      </motion.section>

      {/* Голоса тех, кто уже попробовал */}
      <motion.section 
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
        variants={containerVariants}
        style={{ maxWidth: '1000px', margin: '0 auto 120px', padding: '0 20px' }}
      >
        <motion.h2 variants={itemVariants} style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '60px' }}>Голоса тех, кто уже попробовал</motion.h2>
        <motion.div variants={itemVariants}>
          <TestimonialCarousel />
        </motion.div>
      </motion.section>

      {/* FINAL CTA Section */}
      <motion.section 
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
        variants={containerVariants}
        style={{ maxWidth: '1000px', margin: '0 auto', padding: '100px 20px', textAlign: 'center' }}
      >
        <motion.div 
          variants={itemVariants}
          className="glass-card neon-glow-cyan" 
          style={{ padding: '80px 40px', background: 'radial-gradient(circle at center, rgba(0, 242, 254, 0.1) 0%, transparent 70%)', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '40px' }}
        >
          <h2 style={{ fontSize: '3.5rem', marginBottom: '30px', lineHeight: '1.2' }}>Готовы вернуть себе время?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.4rem', marginBottom: '50px', maxWidth: '700px', margin: '0 auto 50px' }}>
            Попробуйте TaskLens сегодня — ваши тетради больше не будут красть ваши вечера.
          </p>
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(0, 242, 254, 0.6)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateTo('homeworkCheck')}
            className="btn-primary" 
            style={{ padding: '24px 60px', fontSize: '1.5rem', borderRadius: '50px', transition: 'box-shadow 0.3s ease' }}
          >
            Начать проверку
          </motion.button>
        </motion.div>
      </motion.section>

      <style>{`
        @keyframes pulsePlaceholder {
          0% { opacity: 0.1; filter: blur(80px); transform: translate(-50%, -50%) scale(0.9); }
          100% { opacity: 0.3; filter: blur(140px); transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
