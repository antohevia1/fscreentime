import { Link } from 'react-router-dom';
import { LogoText } from '../components/Logo';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-surface text-cream">
      <nav className="flex items-center justify-between px-8 py-5 max-w-4xl mx-auto">
        <Link to="/"><LogoText size={28} /></Link>
      </nav>
      <article className="max-w-3xl mx-auto px-8 py-12 space-y-8">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted">Last updated: February 2026</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">1. Data We Collect</h2>
          <p className="text-sm text-muted leading-relaxed">
            We collect aggregated screen time summaries submitted through the iOS Shortcuts automation. This includes app names, usage duration per app, and the date of the record. We also collect the alias you provide and your email address for authentication purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">2. How We Use Your Data</h2>
          <p className="text-sm text-muted leading-relaxed">
            Your data is used exclusively to power your personal dashboard, goal tracking, and, if you opt in, the community leaderboard. We do not sell, license, or make any commercial use of your personal data. We do not share your data with third parties for advertising or marketing purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">3. Encryption and Security</h2>
          <p className="text-sm text-muted leading-relaxed">
            All data is encrypted in transit using TLS 1.3 and encrypted at rest using AES-256 encryption. Access to production data is restricted to essential operations personnel only and is subject to audit logging.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">4. Community Leaderboard</h2>
          <p className="text-sm text-muted leading-relaxed">
            The leaderboard is strictly opt in. If you choose to participate, only your alias, total weekly screen time, top app category, and top app name are visible to other users. Your email, raw daily data, and any other personal information are never exposed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">5. Data Retention and Deletion</h2>
          <p className="text-sm text-muted leading-relaxed">
            You may request deletion of all your data at any time by contacting us. Upon request, all personal data and screen time records will be permanently removed from our systems within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">6. Cookies and Analytics</h2>
          <p className="text-sm text-muted leading-relaxed">
            We use essential cookies for authentication only. We do not use third party tracking cookies or advertising pixels.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">7. Contact</h2>
          <p className="text-sm text-muted leading-relaxed">
            For any privacy related inquiries, please contact us at <span className="text-cream">privacy@screentime.app</span>.
          </p>
        </section>
      </article>
    </div>
  );
}
