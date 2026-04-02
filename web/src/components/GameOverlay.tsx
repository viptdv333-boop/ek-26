import { useEffect, useRef, useState } from 'react';
import { wsTransport } from '../services/transport/WebSocketTransport';

interface Props {
  isHost: boolean;
  opponentId: string;
  opponentName: string;
  onClose: () => void;
}

const COLS = 20, ROWS = 20;

function initialState() {
  return {
    snake1: [{x:3,y:3},{x:2,y:3},{x:1,y:3}],
    snake2: [{x:COLS-4,y:ROWS-4},{x:COLS-3,y:ROWS-4},{x:COLS-2,y:ROWS-4}],
    food: {x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS)},
    dir1: {x:1,y:0},
    dir2: {x:-1,y:0},
    score1: 0,
    score2: 0,
  };
}

export function GameOverlay({ isHost, opponentId, opponentName, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  // Send message to iframe
  const sendToGame = (type: string, payload: any = {}) => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'snake-host', type, ...payload }, '*');
  };

  useEffect(() => {
    // Listen for messages from iframe
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || e.data.source !== 'snake-game') return;
      const msg = e.data;

      switch (msg.type) {
        case 'ready':
          setReady(true);
          sendToGame('role', { isHost });
          if (isHost) {
            // Tell opponent that game is ready, wait for them
            wsTransport.send('game:state', { targetUserId: opponentId, state: { type: 'waiting' } });
          }
          break;

        case 'move':
          // Guest sends move to host via WS
          wsTransport.send('game:move', { targetUserId: opponentId, gameData: msg.dir });
          break;

        case 'state':
          // Host sends state to guest via WS
          wsTransport.send('game:state', { targetUserId: opponentId, state: msg.state });
          break;

        case 'game-over':
          wsTransport.send('game:state', { targetUserId: opponentId, state: { type: 'game-over', winner: msg.winner, state: msg.state } });
          break;

        case 'restart':
          if (isHost) {
            const state = initialState();
            sendToGame('start', { state });
            wsTransport.send('game:state', { targetUserId: opponentId, state: { type: 'start', state } });
          } else {
            wsTransport.send('game:state', { targetUserId: opponentId, state: { type: 'restart-request' } });
          }
          break;
      }
    };

    // Listen for WS game events
    const handleGameEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { event, data } = detail;

      if (event === 'game:move' && isHost) {
        // Host receives opponent's direction
        sendToGame('opponent-move', { dir: data.gameData });
      }

      if (event === 'game:state') {
        const state = data.state;
        if (state.type === 'start') {
          sendToGame('start', { state: state.state });
        } else if (state.type === 'game-over') {
          sendToGame('game-over', { winner: state.winner });
        } else if (state.type === 'opponent-ready') {
          // Both ready — host starts
          if (isHost) {
            const s = initialState();
            sendToGame('start', { state: s });
            wsTransport.send('game:state', { targetUserId: opponentId, state: { type: 'start', state: s } });
          }
        } else if (state.type === 'restart-request' && isHost) {
          const s = initialState();
          sendToGame('start', { state: s });
          wsTransport.send('game:state', { targetUserId: opponentId, state: { type: 'start', state: s } });
        } else if (!state.type) {
          // Regular state update from host
          sendToGame('state', { state });
        }
      }

      if (event === 'game:end') {
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('game-event', handleGameEvent);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('game-event', handleGameEvent);
    };
  }, [isHost, opponentId]);

  // When ready, notify opponent
  useEffect(() => {
    if (ready && !isHost) {
      wsTransport.send('game:state', { targetUserId: opponentId, state: { type: 'opponent-ready' } });
    }
  }, [ready]);

  const handleClose = () => {
    wsTransport.send('game:end', { targetUserId: opponentId });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0f0f23] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-800 border-b border-dark-600">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐍</span>
          <span className="text-sm font-medium text-white">Snake Battle vs {opponentName}</span>
        </div>
        <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src="/games/snake-2p.html"
        className="flex-1 w-full border-0"
        allow="autoplay"
      />
    </div>
  );
}
