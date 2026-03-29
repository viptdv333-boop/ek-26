import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function PrivacyPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-gray-300 px-4 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/home" className="text-accent hover:underline text-sm">&larr; FOMO Chat</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: March 28, 2026</p>

      <section className="space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-white mt-6">1. Introduction</h2>
        <p>
          FOMO Chat ("we", "our", "us") operates the messaging platform at chat.fomo.broker.
          This Privacy Policy explains how we collect, use, and protect your personal information
          when you use our service.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">2. Information We Collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Account information:</strong> phone number, display name, profile photo, email address (optional).</li>
          <li><strong>Messages:</strong> text messages, images, files, and voice messages you send through the platform.</li>
          <li><strong>Contacts:</strong> when you use the contacts sync feature, we access your phone contacts or Google Contacts solely to find other FOMO Chat users. We do not store contacts of non-registered users.</li>
          <li><strong>Device information:</strong> device type, browser, IP address, session data for security purposes.</li>
          <li><strong>Usage data:</strong> login times, online status, last seen timestamps.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">3. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>To provide and maintain the messaging service.</li>
          <li>To verify your identity via SMS codes during registration.</li>
          <li>To connect you with your contacts who use FOMO Chat.</li>
          <li>To deliver notifications about new messages and calls.</li>
          <li>To ensure security and prevent abuse.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">4. Google API Services</h2>
        <p>
          FOMO Chat uses Google API Services to allow you to sync your Google Contacts.
          When you use this feature:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>We request read-only access to your Google Contacts (<code>contacts.readonly</code> scope).</li>
          <li>We only use phone numbers from your contacts to find registered FOMO Chat users.</li>
          <li>We do not store, share, or transfer your Google Contacts data to third parties.</li>
          <li>Access tokens are used only during the sync session and are not stored on our servers.</li>
          <li>You can revoke access at any time via your <a href="https://myaccount.google.com/permissions" className="text-accent hover:underline" target="_blank" rel="noopener">Google Account permissions</a>.</li>
        </ul>
        <p>
          Our use of information received from Google APIs adheres to the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-accent hover:underline" target="_blank" rel="noopener">
            Google API Services User Data Policy
          </a>, including the Limited Use requirements.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">5. Data Storage and Security</h2>
        <p>
          Your data is stored on secure servers. Messages are stored to enable message history
          and multi-device access. We implement industry-standard security measures to protect
          your information.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">6. Data Sharing</h2>
        <p>
          We do not sell, trade, or share your personal information with third parties, except:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>SMS verification providers (to send verification codes).</li>
          <li>When required by law or legal process.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">7. Your Rights</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Access, update, or delete your account information at any time.</li>
          <li>Delete your account entirely, which removes all your data.</li>
          <li>Revoke third-party access (e.g., Google Contacts) at any time.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">8. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, contact us at:{' '}
          <a href="mailto:support@fomo.broker" className="text-accent hover:underline">support@fomo.broker</a>
        </p>
      </section>

      <div className="mt-8 pt-4 border-t border-dark-600 flex gap-6">
        <Link to="/home" className="text-accent hover:underline text-sm">&larr; FOMO Chat</Link>
        <Link to="/terms" className="text-accent hover:underline text-sm">Terms of Service</Link>
      </div>
    </div>
  );
}
