import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <img src="/logo-f.png" alt="FOMO Chat" className="h-20 w-auto mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-3">FOMO Chat</h1>
          <p className="text-gray-400 text-lg mb-2">Secure messenger for chats, voice and video calls, and file sharing.</p>
          <p className="text-gray-500 text-sm mb-8">FOMO Chat is a messaging platform that lets you send text messages, images, files, voice messages, and make voice and video calls. Your contacts are used only to connect you with other FOMO Chat users.</p>

          <div className="flex flex-col gap-3">
            <Link
              to="/auth"
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-colors"
            >
              Open FOMO Chat
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500 border-t border-dark-700">
        <p className="mb-2">&copy; 2026 FOMO Chat. All rights reserved.</p>
        <div className="flex justify-center gap-4">
          <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link>
        </div>
        <p className="mt-2 text-xs text-gray-600">Contact: support@fomo.broker</p>
      </footer>
    </div>
  );
}
