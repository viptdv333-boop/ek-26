import { useMayakTheme } from '../../hooks/useMayakTheme';

interface MkAvatarProps {
  name: string;
  avatarUrl?: string | null;
  color?: string;
  size?: number;
  online?: boolean;
}

const AVATAR_COLORS = [
  '#E879A0', '#60A5FA', '#3D9B8F', '#D4A054', '#A78BFA',
  '#5B8C6A', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6',
];

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function MkAvatar({ name, avatarUrl, color, size = 48, online }: MkAvatarProps) {
  const { th } = useMayakTheme();
  const bg = color || hashColor(name);
  const initial = name.charAt(0).toUpperCase();
  const dotSize = Math.max(11, size * 0.24);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.42,
            fontWeight: 800,
            color: '#fff',
          }}
        >
          {initial}
        </div>
      )}
      {online && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: th.online,
            border: `2.5px solid ${th.dark ? th.bgFlat : '#fff'}`,
          }}
        />
      )}
    </div>
  );
}

export { hashColor };
