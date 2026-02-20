import { Link } from 'react-router-dom';
import { LogoText } from '../components/Logo';

export default function Terms() {
  return (
    <div className="min-h-screen bg-surface text-cream">
      <nav className="flex items-center justify-between px-8 py-5 max-w-4xl mx-auto">
        <Link to="/"><LogoText size={28} /></Link>
      </nav>
      <article className="max-w-3xl mx-auto px-8 py-12 space-y-8">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted">Last updated: February 2026</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">1. Service Overview</h2>
          <p className="text-sm text-muted leading-relaxed">
            Screentime provides a screen time analytics dashboard and weekly goal challenge system. Users set a daily screen time limit and stake $5.00 USD per challenge week. If the weekly goal is not met, the staked amount is donated to the user's chosen charity. If the goal is met, the stake is returned in full.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">2. Service Fee</h2>
          <p className="text-sm text-muted leading-relaxed">
            Screentime retains a 10% service fee on all processed transactions to cover operational costs including payment processing (Stripe), cloud infrastructure hosting, data storage, and platform maintenance. For a $5.00 stake, the service fee is $0.50. The remaining $4.50 is either returned to you upon goal completion or donated to your selected charity.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">3. Challenge Mechanics</h2>
          <p className="text-sm text-muted leading-relaxed">
            Challenges run on a weekly cycle from Monday through Sunday. Goal compliance is evaluated on Monday following the challenge week. If you begin a challenge mid week, the goal is prorated based on the remaining days. For example, if you set a 2 hour daily limit with 5 days remaining, your weekly target is 10 hours. Challenges set on Sunday begin the following Monday.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">4. Charitable Donations</h2>
          <p className="text-sm text-muted leading-relaxed">
            When a challenge goal is not met, the staked amount (less the service fee) is donated to the charity selected by the user at the time of goal creation. Donations are processed within 7 business days of the evaluation date. Screentime partners with verified charitable organizations and provides donation receipts upon request.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">5. Data Usage</h2>
          <p className="text-sm text-muted leading-relaxed">
            Your screen time data is used solely to provide the service described herein. We do not make commercial use of your data. Please refer to our <Link to="/privacy" className="text-caramel hover:underline">Privacy Policy</Link> for full details on data handling, encryption, and retention.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">6. Limitation of Liability</h2>
          <p className="text-sm text-muted leading-relaxed">
            Screentime is provided on an "as is" basis. We make reasonable efforts to ensure accuracy of screen time data but cannot guarantee completeness due to variations in iOS reporting. Screentime shall not be liable for any indirect, incidental, or consequential damages arising from use of the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">7. Modifications</h2>
          <p className="text-sm text-muted leading-relaxed">
            We reserve the right to modify these terms at any time. Users will be notified of material changes via email. Continued use of the service after notification constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-caramel">8. Contact</h2>
          <p className="text-sm text-muted leading-relaxed">
            For questions regarding these terms, please contact us at <span className="text-cream">legal@screentime.app</span>.
          </p>
        </section>
      </article>
    </div>
  );
}
