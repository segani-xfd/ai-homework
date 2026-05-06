import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, BookOpen, FileText, Hash, BookMarked, AlertCircle, Eye } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

/**
 * Parses text for KaTeX math formulas ($ ... $ for inline, $$ ... $$ for block).
 */
function renderWithMath(text) {
  if (!text) return null;
  // Split text by math delimiters
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 3) {
      return (
        <BlockMath 
          key={i} 
          math={part.slice(2, -2)} 
          renderError={() => <span key={i}>{part}</span>} 
        />
      );
    } else if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
      return (
        <InlineMath 
          key={i} 
          math={part.slice(1, -1)} 
          renderError={() => <span key={i}>{part}</span>} 
        />
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Parses text with special marker brackets and returns React elements.
 * - For student_output: ?*)('№;:(*? marks errors (red)
 * - For right_output: $$%$!@#&&&& marks correct parts (green)
 */
function renderHighlighted(text, regex, color) {
  const safeText = String(text || '');
  if (!safeText || safeText === 'undefined') return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Нет данных</span>;

  const parts = safeText.split(regex);
  // Pattern: normal, highlighted, normal, highlighted, ...
  // Even indices (0, 2, 4...) = normal text
  // Odd indices (1, 3, 5...) = highlighted text
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Highlighted segment
      return (
        <span
          key={i}
          style={{
            color: color,
            background: color === '#f87171' ? 'rgba(248, 113, 113, 0.12)' : 'rgba(34, 197, 94, 0.12)',
            borderRadius: '4px',
            padding: '1px 4px',
            fontWeight: 600,
          }}
        >
          {renderWithMath(part)}
        </span>
      );
    }
    return <span key={i}>{renderWithMath(part)}</span>;
  });
}

const AIHomeworkCheckerCard = ({ rawData }) => {
  const [activeModal, setActiveModal] = React.useState(null); // 'student' or 'correct'

  const parsedData = useMemo(() => {
    if (!rawData) return {};
    const parts = rawData.split(';522ac@#$%@!#');
    const data = {};
    parts.forEach(part => {
      const trimmedPart = part.trim();
      if (!trimmedPart) return;
      const colonIndex = trimmedPart.indexOf(':');
      if (colonIndex > -1) {
        const key = trimmedPart.slice(0, colonIndex).trim();
        const value = trimmedPart.slice(colonIndex + 1).trim();
        data[key] = value;
      }
    });
    return data;
  }, [rawData]);

  const {
    name = 'Неизвестно',
    grade = '-',
    page = '-',
    subject = '-',
    task_number = '-',
    student_output = '',
    right_output = '',
    error_summary = '',
  } = parsedData;

  const errorRegex = /\?\*\)[()'"№;:*?\s]+\*\?/g;
  const correctRegex = /\$\$%\$!@#&&&&|&&&&/g;

  return (
    <>
      <style>{`
        .hw-card-scroll::-webkit-scrollbar { width: 4px; }
        .hw-card-scroll::-webkit-scrollbar-track { background: transparent; }
        .hw-card-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .hw-card-scroll-v { overflow-y: auto; max-height: 200px; }
        @media (max-width: 600px) {
          .hw-card-columns { flex-direction: column !important; }
          .hw-card-column { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .hw-card-column:last-child { border-bottom: none; }
        }
      `}</style>

      <motion.div
        style={{
          background: '#131826', // Solid background to eliminate blur issues
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
          color: '#f8fafc',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Performance and sharpness fixes
          transform: 'translateZ(0)',
          WebkitFontSmoothing: 'antialiased'
        }}
      >
        {/* Header - Student Info (Compact) */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(0, 0, 0, 0.2)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
            <User size={14} color="#60a5fa" />
            <span>{name}</span>
          </div>
          <div style={{ padding: '2px 8px', background: 'rgba(168,85,247,0.2)', borderRadius: '99px', color: '#e879f9', fontWeight: 800, fontSize: '0.75rem' }}>
            {grade}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontWeight: 600 }}>
            <div className="logo-glow-container" style={{ width: '18px', height: '18px', borderRadius: '4px' }}>
              <img src="/logo.png" alt="" />
            </div>
            <span>{subject}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontWeight: 600 }}>
             №{task_number} (Стр. {page})
          </div>
        </div>

        {/* Body - Two Columns (Scrollable, stacked on mobile) */}
        <div className="hw-card-columns" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Left Column */}
          <div className="hw-card-column" style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
            <div onClick={() => setActiveModal('student')} style={{ padding: '8px 16px', background: 'rgba(248, 113, 113, 0.04)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#f87171' }}>Решение</span>
              <Eye size={12} color="#f87171" opacity={0.6} />
            </div>
            <div className="hw-card-scroll hw-card-scroll-v" style={{ padding: '12px 16px', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: 700, color: '#f1f5f9' }}>
              {renderHighlighted(student_output, errorRegex, '#f87171')}
            </div>
          </div>

          {/* Right Column */}
          <div className="hw-card-column" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div onClick={() => setActiveModal('correct')} style={{ padding: '8px 16px', background: 'rgba(34, 197, 94, 0.04)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#22c55e' }}>Эталон</span>
              <Eye size={12} color="#22c55e" opacity={0.6} />
            </div>
            <div className="hw-card-scroll hw-card-scroll-v" style={{ padding: '12px 16px', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: 700, color: '#f1f5f9' }}>
              {renderHighlighted(right_output, correctRegex, '#22c55e')}
            </div>
          </div>
        </div>

        {/* Error Summary (Footer) */}
        {error_summary && (
          <div style={{ padding: '12px 20px', background: 'rgba(168, 85, 247, 0.05)', color: '#d8b4fe', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '8px' }}>
            <AlertCircle size={14} color="#c084fc" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ lineHeight: '1.5' }}>
              <span style={{ fontWeight: 800, color: '#c084fc', marginRight: '6px' }}>Итог:</span>
              {renderWithMath(error_summary.replace(errorRegex, '').replace(correctRegex, ''))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Full View Modal */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ background: '#131826', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: activeModal === 'student' ? '#f87171' : '#22c55e' }}>
                  {activeModal === 'student' ? 'Решение ученика' : 'Верное решение'}
                </h3>
                <button 
                  onClick={() => setActiveModal(null)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '36px', 
                    height: '36px', 
                    color: 'white', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '20px',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
              <div className="hw-card-scroll" style={{ padding: '24px', overflowY: 'auto', fontSize: '16px', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontWeight: 700, color: '#f1f5f9' }}>
                {activeModal === 'student' 
                  ? renderHighlighted(student_output, errorRegex, '#f87171')
                  : renderHighlighted(right_output, correctRegex, '#22c55e')
                }
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIHomeworkCheckerCard;
