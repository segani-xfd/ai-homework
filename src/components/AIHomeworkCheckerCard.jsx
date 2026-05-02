import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, BookOpen, FileText, Hash, BookMarked, AlertCircle } from 'lucide-react';
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
  if (!text) return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Нет данных</span>;

  const parts = text.split(regex);
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
  const parsedData = useMemo(() => {
    if (!rawData) return {};
    const parts = rawData.split(';522ac@#$%@!#');
    const data = {};
    parts.forEach(part => {
      const colonIndex = part.indexOf(':');
      if (colonIndex > -1) {
        data[part.slice(0, colonIndex).trim()] = part.slice(colonIndex + 1).trim();
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

  const errorRegex = /\?\*\)\({1,2}'№;:\(\*\?/g;
  const correctRegex = /\$\$%\$\$?!@#&&&&/g;

  return (
    <>
      <style>{`
        .hw-card-scroll::-webkit-scrollbar { width: 5px; }
        .hw-card-scroll::-webkit-scrollbar-track { background: transparent; }
        .hw-card-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
        .hw-card-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>

      <motion.div
        style={{
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(24px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
          color: '#f8fafc',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        whileHover={{ scale: 1.002, boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)' }}
        transition={{ duration: 0.3 }}
      >
        {/* Header - Student Info */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} color="#60a5fa" />
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>{name}</span>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '1.2rem' }}>|</span>

          {/* Grade */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={14} color="#a78bfa" />
            <span style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
              border: '1px solid rgba(168,85,247,0.3)',
              color: '#e879f9',
              padding: '2px 10px',
              borderRadius: '99px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}>
              {grade}
            </span>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '1.2rem' }}>|</span>

          {/* Subject */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookMarked size={14} color="#94a3b8" />
            <span style={{ color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 500 }}>{subject}</span>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '1.2rem' }}>|</span>

          {/* Task Number */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Hash size={14} color="#94a3b8" />
            <span style={{ color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 500 }}>Задание {task_number}</span>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '1.2rem' }}>|</span>

          {/* Page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} color="#94a3b8" />
            <span style={{ color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 500 }}>Стр. {page}</span>
          </div>
        </div>

        {/* Body - Two Columns */}
        <div style={{ display: 'flex', minHeight: '280px' }}>
          {/* Left Column - Student Output */}
          <div
            style={{
              flex: 1,
              borderRight: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(248, 113, 113, 0.04)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FileText size={13} />
                Решение ученика
              </h3>
            </div>
            <div
              className="hw-card-scroll"
              style={{
                padding: '20px 24px',
                flex: 1,
                overflowY: 'auto',
                fontSize: '14px',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                color: '#e2e8f0',
                fontWeight: 500,
              }}
            >
              {renderHighlighted(student_output, errorRegex, '#f87171')}
            </div>
          </div>

          {/* Right Column - Correct Output */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(34, 197, 94, 0.04)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FileText size={13} />
                Верное решение
              </h3>
            </div>
            <div
              className="hw-card-scroll"
              style={{
                padding: '20px 24px',
                flex: 1,
                overflowY: 'auto',
                fontSize: '14px',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                color: '#e2e8f0',
                fontWeight: 500,
              }}
            >
              {renderHighlighted(right_output, correctRegex, '#22c55e')}
            </div>
          </div>
        </div>
      </motion.div>

      {error_summary && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: '12px',
            padding: '16px 24px',
            background: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '16px',
            color: '#d8b4fe',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            fontWeight: 500,
            maxWidth: '1100px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertCircle size={18} color="#c084fc" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span style={{ fontWeight: 700, display: 'block', marginBottom: '4px', color: '#c084fc' }}>Описание ошибки</span>
              {renderWithMath(error_summary.replace(errorRegex, '').replace(correctRegex, ''))}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default AIHomeworkCheckerCard;
