import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function TermsPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-gray-300 px-4 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/home" className="text-accent hover:underline text-sm">&larr; FOMO Chat</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: March 28, 2026</p>

      <section className="space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-white mt-6">1. Acceptance of Terms</h2>
        <p>
          By accessing or using FOMO Chat at fomo.talk, you agree to be bound by these
          Terms of Service. If you do not agree, do not use the service.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">2. Description of Service</h2>
        <p>
          FOMO Chat is a messaging platform that allows users to send text messages, images,
          files, voice messages, and make voice/video calls. The service is provided "as is"
          and may be updated at any time.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">3. User Accounts</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>You must provide a valid phone number to register.</li>
          <li>You are responsible for maintaining the security of your account.</li>
          <li>You must be at least 13 years old to use the service.</li>
          <li>One person may maintain only one account.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Send spam, unsolicited messages, or malicious content.</li>
          <li>Harass, threaten, or abuse other users.</li>
          <li>Share illegal content or use the service for illegal purposes.</li>
          <li>Attempt to gain unauthorized access to other accounts or systems.</li>
          <li>Use automated tools or bots without authorization.</li>
          <li>Impersonate other users or entities.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">5. Content</h2>
        <p>
          You retain ownership of content you share through FOMO Chat. By using the service,
          you grant us a limited license to store and transmit your content as necessary to
          provide the messaging service.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">6. Third-Party Services</h2>
        <p>
          FOMO Chat integrates with third-party services including Google Contacts for contact
          synchronization. Use of these features is subject to the respective third-party terms
          of service and privacy policies.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">7. Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate these terms.
          You may delete your account at any time through the app settings.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">8. Limitation of Liability</h2>
        <p>
          FOMO Chat is provided "as is" without warranties of any kind. We are not liable for
          any damages arising from your use of the service, including but not limited to data
          loss, service interruptions, or unauthorized access to your account.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">9. Changes to Terms</h2>
        <p>
          We may update these terms at any time. Continued use of the service after changes
          constitutes acceptance of the new terms.
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">10. Contact</h2>
        <p>
          Questions about these terms? Contact us at:{' '}
          <a href="mailto:support@fomo.broker" className="text-accent hover:underline">support@fomo.broker</a>
        </p>
      </section>

      <div className="mt-8 pt-4 border-t border-dark-600 flex gap-6">
        <Link to="/home" className="text-accent hover:underline text-sm">&larr; FOMO Chat</Link>
        <Link to="/privacy" className="text-accent hover:underline text-sm">Privacy Policy</Link>
      </div>
    </div>
  );
}
