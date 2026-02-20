import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { LogoText } from "../components/Logo";

function useReveal() {
  const ref = useRef();
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        }),
      { threshold: 0.15 },
    );
    ref.current?.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return ref;
}

const TESTIMONIALS = [
  {
    name: "Alex K.",
    text: "I was spending 6 hours a day without realizing it. Two weeks in, I am down to 3.",
    saved: "21h/week",
  },
  {
    name: "Priya R.",
    text: "The $5 charity stake sounds small but it completely changed my behavior.",
    saved: "14h/week",
  },
  {
    name: "Sam W.",
    text: "Finally a screen time app that actually makes me care. The charts are gorgeous.",
    saved: "18h/week",
  },
  {
    name: "Luna C.",
    text: "Seeing my name on the leaderboard keeps me accountable every single day.",
    saved: "11h/week",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const pageRef = useReveal();
  const [showGoalSteps, setShowGoalSteps] = useState(false);

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-surface text-cream overflow-hidden"
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto relative z-10">
        <LogoText size={30} />
        <div className="flex items-center gap-4">
          <a
            href="#how"
            className="text-sm text-muted hover:text-cream transition hidden sm:block"
          >
            How it works
          </a>
          <Link
            to={user ? "/app" : "/auth"}
            className="text-sm px-5 py-2 rounded-full bg-caramel text-surface font-medium hover:bg-caramel-light transition"
          >
            {user ? "Dashboard" : "Get Started"}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-8 pt-20 pb-32 text-center">
        <div className="hero-glow bg-caramel absolute top-0 left-1/4 animate-pulse-soft" />
        <div
          className="hero-glow bg-[#b07d52] absolute bottom-0 right-1/4 animate-pulse-soft"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="relative z-10">
          <div className="animate-fade-up">
            <span className="inline-block text-xs uppercase tracking-[0.25em] text-caramel/80 border border-caramel/20 rounded-full px-4 py-1.5 mb-8">
              Your attention is your life
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold leading-[1.05] tracking-tight mb-8 animate-fade-up-delay">
            The hours you spend
            <br />
            <span className="bg-gradient-to-r from-caramel via-accent to-caramel-light bg-clip-text text-transparent">
              define who you become.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up-delay-2">
            Every minute on a screen is a minute not spent living. See the
            truth. Set a boundary. Put real stakes behind it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up-delay-3">
            <Link
              to="/auth"
              className="group relative px-8 py-4 rounded-full bg-caramel text-surface font-semibold text-base hover:bg-caramel-light transition-all shadow-lg shadow-caramel/20 animate-glow"
            >
              Start Your Free Challenge
            </Link>
            <a
              href="#how"
              className="px-8 py-4 rounded-full border border-border text-cream/80 font-medium text-base hover:border-caramel/50 hover:text-cream transition"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-8 text-sm text-muted animate-fade-up-delay-3">
            <span className="text-caramel">1,247 people</span> started their
            challenge this week
          </p>
        </div>
      </section>

      {/* Live ticker */}
      <section className="border-y border-border py-4 overflow-hidden">
        <div className="ticker-track flex gap-12 whitespace-nowrap">
          {[...Array(2)].map((_, rep) => (
            <div key={rep} className="flex gap-12 shrink-0">
              {[
                "🔥 Alex just saved 3.2h today",
                "💰 $5 donated to Red Cross by Maria",
                "🏆 Sam hit 7 day streak",
                "📉 Priya reduced screen time by 40%",
                "🎯 Luna completed her weekly challenge",
                "⚡ 847 hours reclaimed today globally",
                "💪 Tom is on a 14 day streak",
                "🌟 Jess just joined the leaderboard",
              ].map((t, i) => (
                <span key={i} className="text-sm text-muted/70">
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center reveal">
          {[
            { value: "2,847", unit: "hours", label: "Reclaimed this month" },
            { value: "$12,400", unit: "", label: "Donated to charity" },
            { value: "89%", unit: "", label: "Hit their weekly goal" },
            { value: "4.9", unit: "★", label: "Average user rating" },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-surface-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-sm"
            >
              <p className="text-3xl md:text-4xl font-bold text-cream">
                {s.value}
                <span className="text-caramel text-xl ml-1">{s.unit}</span>
              </p>
              <p className="text-sm text-muted mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard preview with responsive heatmap */}
      <section className="py-16 reveal">
        <div className="max-w-5xl mx-auto px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Beautiful insights that{" "}
            <span className="text-caramel">make you care</span>
          </h2>
          <p className="text-muted mb-12 max-w-xl mx-auto">
            Interactive charts, daily heatmaps, app breakdowns, and weekly
            trends.
          </p>
          <div className="relative rounded-2xl border border-border overflow-hidden bg-surface-card p-1 shadow-2xl shadow-black/40">
            <div className="rounded-xl bg-surface p-4 sm:p-6 space-y-4">
              <div className="flex gap-3 overflow-x-auto">
                {["Total: 4.2h", "Daily Avg: 3.8h", "vs Prev: ↓12%"].map(
                  (t, i) => (
                    <div
                      key={i}
                      className="bg-surface-card border border-border rounded-lg px-4 py-2 text-sm shrink-0"
                    >
                      <span className="text-muted text-xs block">
                        {t.split(":")[0]}
                      </span>
                      <span
                        className={`font-semibold ${i === 2 ? "text-emerald-400" : "text-cream"}`}
                      >
                        {t.split(":")[1]}
                      </span>
                    </div>
                  ),
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-card border border-border rounded-xl p-4 h-40">
                  <p className="text-xs text-muted mb-3">Usage by Day</p>
                  <div className="flex items-end gap-2 h-24">
                    {[65, 45, 80, 55, 90, 35, 50].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-caramel/60 to-caramel"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="bg-surface-card border border-border rounded-xl p-4 h-40">
                  <p className="text-xs text-muted mb-3">Top Apps</p>
                  <div className="space-y-2">
                    {[
                      { name: "Chrome", w: "85%", color: "#FF6B6B" },
                      { name: "VS Code", w: "72%", color: "#4ECDC4" },
                      { name: "Slack", w: "45%", color: "#FFE66D" },
                      { name: "Spotify", w: "30%", color: "#A78BFA" },
                    ].map((app, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted w-14 text-right">
                          {app.name}
                        </span>
                        <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: app.w, backgroundColor: app.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Heatmap spelling fscreentime — full width, clipped */}
              <div className="bg-surface-card border border-border rounded-xl p-4 overflow-hidden">
                <p className="text-xs text-muted mb-2">Daily Activity</p>
                <HeatmapBrand />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface to-transparent" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-8 py-24 reveal">
        <div className="text-center mb-4">
          <span className="inline-block text-xs uppercase tracking-[0.15em] text-muted border border-border rounded-full px-4 py-1.5">
            iPhone only · Android coming soon
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          {showGoalSteps ? "Set a screen time goal" : "Three steps to"}{" "}
          {!showGoalSteps && (
            <span className="text-caramel">owning your time</span>
          )}
          {showGoalSteps && (
            <span className="text-caramel">with real stakes</span>
          )}
        </h2>

        <div className="relative">
          {!showGoalSteps ? (
            <div className="grid md:grid-cols-3 gap-8">
              <StepCard
                step="01"
                title="Install Shortcuts"
                icon={
                  <div className="w-16 h-16 rounded-[18px] shadow-xl shadow-[#EF3E56]/25 flex items-center justify-center relative overflow-hidden">
                    <img src="/shortcuss.webp" alt="Shortcuss" />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[18px]" />
                  </div>
                }
                iconLink="https://apps.apple.com/app/shortcuts/id915249334"
                desc={
                  <>
                    Download{" "}
                    <a
                      href="https://apps.apple.com/app/shortcuts/id915249334"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-caramel hover:underline"
                    >
                      Shortcuts
                    </a>{" "}
                    from the App Store. Pre installed on iOS 13+.
                  </>
                }
              />
              <StepCard
                step="02"
                title="Add Our Automation"
                icon={
                  <div
                    className="w-16 h-16 rounded-[18px] shadow-xl shadow-caramel/25 flex items-center justify-center relative overflow-hidden"
                    style={{
                      transform:
                        "perspective(400px) rotateY(12deg) rotateX(6deg)",
                      background:
                        "linear-gradient(135deg, #d4aa80 0%, #c4956a 40%, #b07d52 100%)",
                    }}
                  >
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[18px]" />
                  </div>
                }
                iconLink="#"
                desc="Tap to install our shortcut. It runs daily and syncs your screen time automatically."
              />
              <StepCard
                step="03"
                title="Set Your Alias"
                icon={
                  <div
                    className="w-16 h-16 rounded-[18px] shadow-xl shadow-[#A78BFA]/25 flex items-center justify-center relative overflow-hidden"
                    style={{
                      transform:
                        "perspective(400px) rotateY(-12deg) rotateX(6deg)",
                      background:
                        "linear-gradient(135deg, #c4b5fd 0%, #A78BFA 40%, #7C5FD3 100%)",
                    }}
                  >
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[18px]" />
                  </div>
                }
                desc="On first run, enter your display name. Your dashboard populates within 24 hours."
              />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              <StepCard
                step="04"
                title="Set Daily Limit"
                icon={
                  <Icon3D
                    color="from-[#4ECDC4] to-[#2BA8A0]"
                    shadow="shadow-[#4ECDC4]/25"
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </Icon3D>
                }
                desc="Choose how many hours per day you want to allow. Your weekly budget is calculated automatically."
              />
              <StepCard
                step="05"
                title="Pick a Charity"
                icon={
                  <Icon3D
                    color="from-[#FF6B6B] to-[#D94F4F]"
                    shadow="shadow-[#FF6B6B]/25"
                    rotate="rotateY(8deg)"
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </Icon3D>
                }
                desc="Select where your $5 goes if you miss the goal. Every dollar does good either way."
              />
              <StepCard
                step="06"
                title="Stake $5"
                icon={
                  <Icon3D
                    color="from-[#A78BFA] to-[#7C5FD3]"
                    shadow="shadow-[#A78BFA]/25"
                    rotate="rotateY(-8deg)"
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </Icon3D>
                }
                desc="Hit your goal? The challenge rolls over to next week. Miss it? The amount is donated to your chosen charity."
              />
            </div>
          )}

          {/* Toggle CTA — right side on desktop, below on mobile */}
          <div className="md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 md:translate-x-[calc(100%+2rem)] flex md:flex-col items-center mt-10 md:mt-0">
            <button
              onClick={() => setShowGoalSteps(!showGoalSteps)}
              className="group flex md:flex-col items-center gap-3 md:gap-4 text-center"
            >
              {!showGoalSteps ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-caramel to-accent flex items-center justify-center shadow-lg shadow-caramel/20 group-hover:scale-110 transition-transform">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </div>
                  <span className="text-xs text-caramel font-medium leading-tight max-w-[100px]">
                    Ready to
                    <br className="hidden md:block" /> raise the stakes?
                  </span>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-surface-card border border-border flex items-center justify-center group-hover:border-caramel/40 transition">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9a8e80"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 12H5M11 18l-6-6 6-6" />
                    </svg>
                  </div>
                  <span className="text-xs text-muted font-medium">Back</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Psychology */}
      <section className="py-24 reveal">
        <div className="max-w-5xl mx-auto px-8">
          <div className="bg-gradient-to-br from-surface-card to-surface-light rounded-3xl border border-border p-10 md:p-16 relative overflow-hidden">
            <div className="hero-glow bg-caramel absolute -top-20 -right-20 w-80 h-80 opacity-10" />
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs uppercase tracking-[0.15em] text-caramel/70 mb-4 block">
                  The science of commitment
                </span>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
                  $5 is nothing.
                  <br />
                  <span className="text-caramel">
                    Losing $5 changes everything.
                  </span>
                </h2>
                <p className="text-muted leading-relaxed mb-6">
                  Nobel Prize winning research shows you are 2.5× more motivated
                  to avoid a loss than to chase a gain. Set a weekly screen time
                  goal, put $5 behind it, and choose a charity. Miss your target
                  and the money goes to a good cause. Hit it and you keep your
                  time, your money, and your momentum.
                </p>
                <Link
                  to="/auth"
                  className="inline-block px-6 py-3 rounded-full bg-caramel text-surface font-semibold text-sm hover:bg-caramel-light transition"
                >
                  Set Your First Goal
                </Link>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: "🎯",
                    title: "Set your daily limit",
                    desc: "Choose 1h, 2h, whatever feels right",
                  },
                  {
                    icon: "💰",
                    title: "Stake $5 per week",
                    desc: "Small enough to commit, big enough to care",
                  },
                  {
                    icon: "❤️",
                    title: "Pick a charity",
                    desc: "If you miss your goal, the money does good anyway",
                  },
                  {
                    icon: "📊",
                    title: "Track your progress",
                    desc: "Beautiful charts show exactly where you stand",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-4 items-start bg-surface/50 rounded-xl p-4 border border-border/50"
                  >
                    <span className="text-2xl mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-cream">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 reveal">
        <div className="max-w-5xl mx-auto px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            People are{" "}
            <span className="text-caramel">reclaiming their time</span>
          </h2>
          <p className="text-muted text-center mb-14 max-w-lg mx-auto">
            Real results from real people.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="bg-surface-card rounded-2xl p-6 border border-border hover:border-caramel/20 transition relative"
              >
                <div className="absolute top-4 right-4 text-xs bg-emerald-500/10 text-emerald-400 rounded-full px-2.5 py-0.5 font-medium">
                  {t.saved}
                </div>
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <span key={s} className="text-caramel text-sm">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-cream/90 leading-relaxed mb-4">
                  "{t.text}"
                </p>
                <p className="text-xs text-muted">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-20 reveal">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <blockquote className="text-2xl md:text-4xl font-light italic leading-relaxed text-cream/80">
            "The price of anything is the amount of life you exchange for it."
          </blockquote>
          <p className="text-sm text-caramel/60 mt-6">Henry David Thoreau</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 reveal">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <div className="bg-gradient-to-br from-surface-card to-surface-light rounded-3xl border border-border p-12 md:p-16 relative overflow-hidden">
            <div className="hero-glow bg-caramel absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-10" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Your future self
                <br />
                is watching.
              </h2>
              <p className="text-muted mb-10 text-lg max-w-md mx-auto">
                Every week you wait is another 30+ hours lost to autopilot.
                Start today. It takes 30 seconds.
              </p>
              <Link
                to="/auth"
                className="inline-block px-10 py-4 rounded-full bg-caramel text-surface font-bold text-lg hover:bg-caramel-light transition-all shadow-lg shadow-caramel/25 animate-glow"
              >
                Begin Your Challenge
              </Link>
              <p className="mt-6 text-xs text-muted">
                Free forever · No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 reveal">
        <div className="max-w-3xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked <span className="text-caramel">Questions</span>
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Is fScreentime really free?",
                a: "Yes. The dashboard and analytics are completely free. You only pay $5 when you choose to set a weekly challenge goal.",
              },
              {
                q: "How does the $5 challenge work?",
                a: "You set a daily screen time limit and stake $5. If you exceed your weekly budget, the money (minus a 10% service fee) is donated to your chosen charity. If you hit your goal, the challenge rolls over to the next week.",
              },
              {
                q: "What happens to my data?",
                a: "Your data is encrypted in transit and at rest. We never sell or commercially use your data. Only you can see your screen time unless you opt into the community leaderboard.",
              },
              {
                q: "Does it work on Android?",
                a: "Not yet. We are currently iPhone only using the iOS Shortcuts automation. Android support is in development and coming soon.",
              },
              {
                q: "What if I start mid week?",
                a: "Your goal is prorated. If you start on Wednesday with a 2h daily limit, your budget for that week is 2h × remaining days until Sunday.",
              },
              {
                q: "Can I change my charity?",
                a: "You can reset your goal at any time and pick a new charity for the next challenge period.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="group bg-surface-card border border-border rounded-xl"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-sm font-medium text-cream hover:text-caramel transition list-none">
                  {faq.q}
                  <span className="text-muted group-open:rotate-45 transition-transform text-lg ml-4">
                    +
                  </span>
                </summary>
                <p className="px-6 pb-4 text-sm text-muted leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-5xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <LogoText size={24} />
          <div className="flex gap-6 text-sm text-muted">
            <a href="#how" className="hover:text-cream transition">
              How it works
            </a>
            <Link to="/privacy" className="hover:text-cream transition">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-cream transition">
              Terms
            </Link>
          </div>
          <p className="text-xs text-muted/60">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ step, title, icon, iconLink, desc }) {
  const iconEl = icon ? (
    iconLink ? (
      <a
        href={iconLink}
        target={iconLink.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="inline-block mb-5 hover:scale-105 transition-transform"
      >
        {icon}
      </a>
    ) : (
      <div className="mb-5">{icon}</div>
    )
  ) : null;

  return (
    <div className="bg-surface-card rounded-2xl p-8 border border-border hover:border-caramel/30 transition group">
      <span className="text-xs font-mono text-caramel/60">{step}</span>
      <h3 className="text-lg font-semibold mt-3 mb-4">{title}</h3>
      {iconEl}
      <p className="text-sm text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function Icon3D({
  children,
  color = "from-caramel to-accent",
  shadow = "shadow-caramel/25",
  rotate = "rotateY(-8deg)",
}) {
  return (
    <div
      className={`w-16 h-16 rounded-[18px] shadow-xl ${shadow} flex items-center justify-center relative overflow-hidden bg-gradient-to-br ${color}`}
      style={{ transform: `perspective(400px) ${rotate} rotateX(6deg)` }}
    >
      {children}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[18px]" />
    </div>
  );
}

// Heatmap that spells "fscreentime" using dots — responsive, full width
function HeatmapBrand() {
  // 5-row pixel font for "fscreentime"
  const letters = {
    f: ["111", "100", "110", "100", "100"],
    s: ["011", "100", "010", "001", "110"],
    c: ["111", "100", "100", "100", "111"],
    r: ["110", "101", "110", "101", "101"],
    e: ["111", "100", "110", "100", "111"],
    n: ["101", "111", "111", "101", "101"],
    t: ["111", "010", "010", "010", "010"],
    i: ["01", "01", "01", "01", "01"],
    m: ["10001", "11011", "10101", "10001", "10001"],
  };
  const word = "fscreentime";
  // Build 5-row grid
  const rows = [[], [], [], [], []];
  for (const ch of word) {
    const l = letters[ch] || letters["."];
    for (let r = 0; r < 5; r++) {
      for (const bit of l[r]) rows[r].push(bit === "1");
      rows[r].push(false); // spacing
    }
  }
  const cols = rows[0].length;
  // Pad to fill ~52 columns (full year width) by repeating pattern
  const targetCols = 52;
  const padLeft = Math.floor((targetCols - cols) / 2);

  return (
    <div className="w-full overflow-hidden">
      <div className="flex gap-[3px] justify-center">
        {Array.from({ length: targetCols }, (_, c) => (
          <div key={c} className="flex flex-col gap-[3px]">
            {Array.from({ length: 5 }, (_, r) => {
              const ci = c - padLeft;
              const on = ci >= 0 && ci < cols && rows[r][ci];
              return (
                <div
                  key={r}
                  className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] rounded-[1px]"
                  style={{ backgroundColor: on ? "#c4956a" : "#3e3830" }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
