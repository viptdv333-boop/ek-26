interface Message {
  id: string;
  text?: string;
  createdAt: string;
  status: string;
}

interface Props {
  message: Message;
  isMine: boolean;
}

export function MessageBubble({ message, isMine }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString('ru', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-3.5 py-2 rounded-2xl ${
          isMine
            ? 'bg-accent text-white rounded-br-md'
            : 'bg-dark-600 text-gray-100 rounded-bl-md'
        }`}
      >
        {message.text && <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>}
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? 'text-white/50' : 'text-gray-500'}`}>
          <span className="text-[10px]">{time}</span>
          {isMine && (
            <span className="text-[10px]">
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
