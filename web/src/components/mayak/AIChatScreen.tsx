import { useMayakTheme } from '../../hooks/useMayakTheme';
import { Stars } from './Stars';

interface AIChatScreenProps {
  onOpenAIChat: () => void;
}

export function AIChatScreen({ onOpenAIChat }: AIChatScreenProps) {
  const { th } = useMayakTheme();

  const suggestions = ['Напиши поздравление', 'Переведи текст', 'Придумай идею для подарка'];

  return (
    <div
      style={{
        background: th.bg,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {th.stars && <Stars />}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 14px 12px',
          borderBottom: `1px solid ${th.divider}`,
          position: 'relative',
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: `linear-gradient(135deg,${th.primary},#818CF8)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 16px ${th.glow}`,
            flexShrink: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" stroke="none">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: th.text }}>AI Помощник</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: th.primary }}>Всегда на связи</div>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          position: 'relative',
          zIndex: 1,
          gap: 24,
        }}
      >
        {/* AI avatar */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `linear-gradient(135deg,${th.primary},#818CF8)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 40px ${th.glow}`,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff" stroke="none">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: th.text, marginBottom: 8 }}>
            Привет! Я AI-помощник FOMO
          </div>
          <div style={{ fontSize: 15, color: th.sec, lineHeight: 1.5 }}>
            Могу помочь написать текст, перевести сообщение или просто поболтать
          </div>
        </div>

        {/* Suggestion chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={onOpenAIChat}
              style={{
                padding: '10px 16px',
                borderRadius: 20,
                background: th.inputBg,
                border: `1.5px solid ${th.primary}22`,
                fontSize: 14,
                fontWeight: 600,
                color: th.primary,
                cursor: 'pointer',
                transition: 'background .15s',
              }}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Open AI chat button */}
        <div
          onClick={onOpenAIChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 28px',
            borderRadius: 24,
            background: `linear-gradient(135deg,${th.key === 'warm' ? '#D97757' : '#6366f1'},#818CF8)`,
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 18px ${th.glow}`,
            marginTop: 8,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Начать чат с AI
        </div>
      </div>
    </div>
  );
}
