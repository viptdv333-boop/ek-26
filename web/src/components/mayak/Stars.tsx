import { useMemo } from 'react';

export function Stars() {
  const dots = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: 0.5 + Math.random() * 1.5,
        o: 0.15 + Math.random() * 0.4,
        d: 2 + Math.random() * 4,
        delay: i * 0.15,
      })),
    [],
  );

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.s,
            height: d.s,
            borderRadius: '50%',
            background: '#fff',
            opacity: d.o,
            animation: `mkTwinkle ${d.d}s ease-in-out infinite`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
