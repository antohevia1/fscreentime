import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface text-cream">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <span className="text-lg font-semibold tracking-tight text-caramel">screentime</span>
        <Link to={user ? '/app' : '/auth'}
          className="text-sm px-5 py-2 rounded-full bg-caramel text-surface font-medium hover:bg-caramel-light transition">
          {user ? 'Dashboard' : 'Get Started'}
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-32 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-caramel mb-6">Your attention is your life</p>
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8">
          The hours you spend<br />
          <span className="text-caramel">define who you become.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
          Every minute on a screen is a minute not spent living. We do not judge, we illuminate.
          See the truth, set a boundary, and put real stakes behind it.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/auth"
            className="px-8 py-3.5 rounded-full bg-caramel text-surface font-semibold text-base hover:bg-caramel-light transition shadow-lg shadow-caramel/20">
            Start Your Challenge for Free
          </Link>
          <a href="#how"
            className="px-8 py-3.5 rounded-full border border-border text-cream/80 font-medium text-base hover:border-caramel/50 transition">
            See How It Works
          </a>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-border py-12">
        <div className="max-w-5xl mx-auto px-8 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-caramel">2,847</p>
            <p className="text-sm text-muted mt-1">Hours reclaimed this month</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-caramel">$12,400</p>
            <p className="text-sm text-muted mt-1">Donated to charity</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-caramel">89%</p>
            <p className="text-sm text-muted mt-1">Hit their weekly goal</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-8 py-24">
        <div className="text-center mb-4">
          <span className="text-xs uppercase tracking-[0.15em] text-muted">Currently available on iPhone · Android coming soon</span>
        </div>
        <h2 className="text-3xl font-bold text-center mb-16">
          Three steps to <span className="text-caramel">owning your time</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          <div className="bg-surface-card rounded-xl p-6 border border-border">
            <span className="text-xs font-mono text-caramel">01</span>
            <h3 className="text-lg font-semibold mt-3 mb-3">Install Shortcuts</h3>
            <a href="https://apps.apple.com/app/shortcuts/id915249334" target="_blank" rel="noopener noreferrer"
              className="inline-block mb-4 hover:scale-105 transition-transform">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6482] via-[#EF3E56] to-[#F2425B] shadow-lg shadow-[#EF3E56]/30 flex items-center justify-center"
                style={{ transform: 'perspective(200px) rotateY(-8deg) rotateX(4deg)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="3" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
            </a>
            <p className="text-sm text-muted leading-relaxed">
              Download <a href="https://apps.apple.com/app/shortcuts/id915249334" target="_blank" rel="noopener noreferrer" className="text-caramel hover:underline">Shortcuts</a> from the App Store. Pre installed on iOS 13+.
            </p>
          </div>

          <div className="bg-surface-card rounded-xl p-6 border border-border">
            <span className="text-xs font-mono text-caramel">02</span>
            <h3 className="text-lg font-semibold mt-3 mb-3">Add Our Automation</h3>
            <a href="#" className="inline-block mb-4 hover:scale-105 transition-transform">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-caramel to-accent shadow-lg shadow-caramel/30 flex items-center justify-center"
                style={{ transform: 'perspective(200px) rotateY(8deg) rotateX(4deg)' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
            </a>
            <p className="text-sm text-muted leading-relaxed">
              Tap to install our shortcut. It runs daily and syncs your screen time automatically.
            </p>
          </div>

          <div className="bg-surface-card rounded-xl p-6 border border-border">
            <span className="text-xs font-mono text-caramel">03</span>
            <h3 className="text-lg font-semibold mt-3 mb-3">Set Your Alias</h3>
            <p className="text-sm text-muted leading-relaxed">
              On first run, enter your display name. Your dashboard populates within 24 hours.</p>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="bg-surface-light py-24">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <blockquote className="text-2xl md:text-3xl font-light italic leading-relaxed text-cream/90">
            "The price of anything is the amount of life you exchange for it."
          </blockquote>
          <p className="text-sm text-muted mt-4">Henry David Thoreau</p>
          <p className="text-muted mt-8 leading-relaxed max-w-xl mx-auto">
            Loss aversion is the most powerful force in behavioral economics.
            You are 2.5× more motivated to avoid losing $5 than to gain $5.
            We use that science to help you win back your most precious resource: time.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-8 py-24 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Your future self is watching.
        </h2>
        <p className="text-muted mb-10 text-lg">Make them proud. Start today. It takes 30 seconds.</p>
        <Link to="/auth"
          className="inline-block px-10 py-4 rounded-full bg-caramel text-surface font-semibold text-lg hover:bg-caramel-light transition shadow-lg shadow-caramel/20">
          Begin Your Challenge
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted">
        screentime © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
