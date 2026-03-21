interface Message {
  id: string;
  text?: string;
  senderName?: string;
  createdAt: string;
  status: string;
}

interface Props {
  message: Message;
  isMine: boolean;
  showSender?: boolean;
}

export function MessageBubble({ message, isMine, showSender }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString('ru', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusIcon = () => {
    if (!isMine) return null;
    switch (message.status) {
      case 'read': return <span className="text-[10px] text-blue-300">✓✓</span>;
      case 'delivered': return <span className="text-[10px]">✓✓</span>;
      default: return <span className="text-[10px]">✓</span>;
    }
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-3.5 py-2 rounded-2xl ${
          isMine
            ? 'bg-accent text-white rounded-br-md'
            : 'bg-dark-600 text-gray-100 rounded-bl-md'
        }`}
      >
        {showSender && !isMine && message.senderName && (
          <p className="text-xs font-medium text-accent mb-0.5">{message.senderName}</p>
        )}
        {message.text && <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>}
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? 'text-white/50' : 'text-gray-500'}`}>
          <span className="text-[10px]">{time}</span>
          {statusIcon()}
        </div>
      </div>
    </div>
  );
}
