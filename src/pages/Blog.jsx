import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { LogoText } from "../components/Logo";

/* ── scroll-reveal hook (same pattern as Landing) ── */
function useReveal() {
  const ref = useRef();
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        }),
      { threshold: 0.12 },
    );

    // Observe all current .reveal elements
    container.querySelectorAll(".reveal").forEach((el) => obs.observe(el));

    // Watch for dynamically-added .reveal elements so none stay invisible
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.classList?.contains("reveal")) obs.observe(node);
          node.querySelectorAll?.(".reveal").forEach((el) => obs.observe(el));
        }
      }
    });
    mo.observe(container, { childList: true, subtree: true });

    return () => { obs.disconnect(); mo.disconnect(); };
  }, []);
  return ref;
}

/* ── decorative divider ── */
function Divider() {
  return (
    <div className="flex items-center justify-center gap-4 my-16 md:my-24 reveal">
      <span className="block w-12 h-px bg-caramel/20" />
      <span className="block w-1.5 h-1.5 rounded-full bg-caramel/40" />
      <span className="block w-12 h-px bg-caramel/20" />
    </div>
  );
}

/* ── pull-quote component ── */
function PullQuote({ children, author }) {
  return (
    <figure className="reveal my-16 md:my-24 relative">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-caramel/10 text-[120px] leading-none font-serif pointer-events-none select-none">"</div>
      <blockquote className="relative z-10 text-center max-w-2xl mx-auto">
        <div className="text-cream/90 text-lg md:text-xl leading-relaxed italic font-light whitespace-pre-line">
          {children}
        </div>
      </blockquote>
      {author && (
        <figcaption className="text-center mt-6 text-sm text-caramel/60 tracking-wide">
          — {author}
        </figcaption>
      )}
    </figure>
  );
}

/* ── stat callout ── */
function StatCallout({ number, label }) {
  return (
    <div className="reveal text-center py-12 md:py-16">
      <span className="block text-5xl md:text-7xl font-bold text-caramel tabular-nums">{number}</span>
      <span className="block mt-3 text-sm text-muted tracking-wide uppercase">{label}</span>
    </div>
  );
}

/* ── paragraph with drop cap option ── */
function Prose({ children, dropCap = false }) {
  return (
    <div className={`reveal text-muted text-base md:text-lg leading-[1.85] max-w-2xl mx-auto ${dropCap ? "blog-drop-cap" : ""}`}>
      {children}
    </div>
  );
}

/* ── section heading ── */
function SectionHeading({ children }) {
  return (
    <h2 className="reveal text-2xl md:text-3xl font-bold text-cream text-center max-w-xl mx-auto leading-snug mb-8">
      {children}
    </h2>
  );
}

/* ══════════════════════════════════════════════════════
   BLOG POST: Why You Should Keep Your Screen Time Under Control
   ══════════════════════════════════════════════════════ */

function PostScreenTime() {
  return (
    <article className="relative">
      {/* Hero */}
      <header className="relative text-center pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        <div className="hero-glow text-caramel absolute top-0 left-1/3 animate-pulse-soft opacity-[0.08]" />
        <div className="hero-glow text-[#b07d52] absolute bottom-0 right-1/4 animate-pulse-soft opacity-[0.06]" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <p className="reveal text-caramel text-xs tracking-[0.3em] uppercase mb-6">Essay · Screen Time · Digital Wellbeing</p>
          <h1 className="reveal text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8 text-cream">
            The Quiet War<br />
            <span className="text-caramel">for Your Attention</span>
          </h1>
          <p className="reveal text-muted text-lg md:text-xl leading-relaxed max-w-xl mx-auto">
            Why keeping your screen time under control is the most important
            battle you didn't know you were fighting.
          </p>
          <p className="reveal text-muted/40 text-sm mt-8">12 min read</p>
        </div>
      </header>

      {/* ── Chapter 1: The Wake-Up Call ── */}
      <section className="max-w-3xl mx-auto px-6">
        <Prose dropCap>
          <p>
            There was a Tuesday night, nothing special about it, when I picked up my phone to check the time
            and set it down forty-five minutes later, mid-scroll through a thread about productivity tips I would
            never follow. The irony didn't hit me until the next morning. I was reading about reclaiming my time
            while handing it away, minute by minute, to an algorithm that knew my weaknesses better than I did.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            That moment felt small. Forgettable. But it was the shape of something enormous. Because that wasn't
            one bad night. It was every night. And every morning. And every wait in line, every red light, every
            quiet moment that used to belong to my own thoughts.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            If you've ever unlocked your phone with no purpose and locked it again five minutes later with
            nothing gained... you know exactly what I mean. It's the modern reflex. The phantom itch. And it's
            costing us more than we think.
          </p>
        </Prose>
      </section>

      <StatCallout number="4.5 hrs" label="Average daily screen time for adults worldwide" />

      <Divider />

      {/* ── Chapter 2: The Modern Struggle ── */}
      <section className="max-w-3xl mx-auto px-6">
        <SectionHeading>
          You are not weak.<br />
          <span className="text-caramel">The game is rigged.</span>
        </SectionHeading>

        <Prose>
          <p>
            Naval Ravikant said it better than anyone. Read this slowly, let it settle in your chest
            like a stone:
          </p>
        </Prose>

        <PullQuote author="Naval Ravikant">
{`The modern struggle:

Lone individuals summoning inhuman willpower,
fasting, meditating, and exercising…

…up against armies of scientists & statisticians
weaponizing abundant food, screens, & medicine
into junk food, clickbait news, infinite porn,
endless games & addictive drugs.`}
        </PullQuote>

        <Prose>
          <p>
            Read that again. Armies. Scientists. Statisticians. These aren't metaphors. Every major
            social media platform employs teams whose entire job, whose entire career, is to make
            you pick up your phone one more time. To keep you scrolling one more minute. To make
            the next video auto-play before you've finished processing the last one. They call it
            "engagement." It's a polite word for addiction by design.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            The slot machine in your pocket was engineered by the brightest minds of a generation.
            Variable reward schedules. Infinite scroll. Pull-to-refresh, a gesture borrowed directly
            from slot machines. The red notification badge? Designed after casino chips. This is not
            a fair fight. It was never meant to be.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            And here you are, one person, trying to summon willpower against a system built to
            dissolve it. That doesn't make you weak. It makes you brave for even trying.
          </p>
        </Prose>
      </section>

      <Divider />

      {/* ── Chapter 3: What Screen Time Actually Costs ── */}
      <section className="max-w-3xl mx-auto px-6">
        <SectionHeading>
          The theft happens in<br />
          <span className="text-caramel">minutes, not hours</span>
        </SectionHeading>

        <Prose>
          <p>
            We talk about screen time in averages. Four and a half hours a day, thirty-one hours a week.
            But averages are liars. They flatten the truth into something digestible. The real cost isn't
            measured in hours. It's measured in what those hours were supposed to be.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            It's the book you've been meaning to read for six months, still bookmarked at page forty-two.
            It's the guitar gathering dust in the corner. It's the conversation with your partner where
            you're physically present but mentally scrolling. It's falling asleep to a screen and waking
            up to one, and never quite feeling rested in between.
          </p>
        </Prose>

        <PullQuote author="Seneca, On the Shortness of Life">
{`It is not that we have a short time to live,
but that we waste a great deal of it.`}
        </PullQuote>

        <Prose>
          <p>
            Seneca wrote that two thousand years ago. Before smartphones. Before social media.
            Before the attention economy. And somehow it hits harder now than ever. Because we
            don't just waste time anymore. We have it extracted from us, refined, and sold.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            A friend once told me: "I don't even enjoy most of what I see on my phone. I just…
            keep looking." That's the cruelest part. It's not even pleasurable anymore. It's
            compulsive. Like biting your nails. You don't do it because it feels good. You do
            it because stopping feels worse.
          </p>
        </Prose>
      </section>

      <StatCallout number="2,617" label="Times the average person touches their phone per day" />

      <Divider />

      {/* ── Chapter 4: The Body Remembers ── */}
      <section className="max-w-3xl mx-auto px-6">
        <SectionHeading>
          Your body is keeping<br />
          <span className="text-caramel">the score</span>
        </SectionHeading>

        <Prose>
          <p>
            Excessive screen time doesn't just steal your hours. It rewires your biology.
            Blue light at midnight suppresses melatonin production, fracturing your sleep
            architecture. The constant context-switching between apps fragments your
            attention span. Studies suggest it now averages around eight seconds.
            Shorter than a goldfish. That's not a joke. That's a clinical finding.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            The dopamine loop is real. Every notification, every like, every new piece of
            content triggers a micro-hit. Your brain adapts. It raises the bar. What used
            to feel interesting becomes dull. What used to feel dull becomes unbearable.
            This is why a quiet afternoon feels restless. Why waiting without a phone
            feels like punishment. Your baseline has shifted.
          </p>
        </Prose>

        <PullQuote author="Cal Newport, Digital Minimalism">
{`The urge to check Twitter or refresh Reddit
becomes a nervous twitch that shatters
uninterrupted time into shards
too small to support the presence
necessary for an intentional life.`}
        </PullQuote>

        <Prose>
          <p>
            I remember the first time I left my phone at home for an entire afternoon. Not
            on purpose. I just forgot it. For the first thirty minutes, I felt phantom vibrations
            in my pocket. My hand kept reaching for something that wasn't there. It took
            almost an hour before I stopped. And then something strange happened. The world
            got a little louder. Colors got a little sharper. I noticed the way sunlight
            came through the trees in my neighborhood. Trees I had walked past a thousand
            times without seeing.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            That's what's on the other side. Not some monk-like asceticism. Just…
            actually being where you are.
          </p>
        </Prose>
      </section>

      <Divider />

      {/* ── Chapter 5: The Myth of Willpower ── */}
      <section className="max-w-3xl mx-auto px-6">
        <SectionHeading>
          Willpower is a<br />
          <span className="text-caramel">terrible strategy</span>
        </SectionHeading>

        <Prose>
          <p>
            Here is the uncomfortable truth about screen time and phone addiction: knowing it's a
            problem doesn't fix it. You already know you spend too much time on your phone.
            You've known for years. You've deleted apps and re-downloaded them. You've set
            limits and dismissed them. You've promised yourself "just five more minutes"
            a thousand times. None of it sticks.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            That's not a character flaw. That's a design feature. Willpower is a finite
            resource. Psychologists call it ego depletion. Every decision you make throughout
            the day draws from the same well. By evening, when your screen time is highest,
            the well is dry. You're fighting the strongest algorithms in history with your
            weakest self.
          </p>
        </Prose>

        <PullQuote author="James Clear, Atomic Habits">
{`You do not rise to the level of your goals.
You fall to the level of your systems.`}
        </PullQuote>

        <Prose>
          <p>
            That's why systems beat intentions. That's why accountability beats aspiration.
            That's why putting ten dollars on the line, real money, to a real charity,
            changes behavior in a way that a New Year's resolution never could. Loss
            aversion is hardwired. It's older than language. And when you harness it
            deliberately, it becomes the most powerful tool for reducing screen time
            you've ever tried.
          </p>
        </Prose>
      </section>

      <Divider />

      {/* ── Chapter 6: Small Shifts, Tectonic Change ── */}
      <section className="max-w-3xl mx-auto px-6">
        <SectionHeading>
          You don't need a<br />
          <span className="text-caramel">digital detox</span>
        </SectionHeading>

        <Prose>
          <p>
            Let me be honest with you: I'm not here to tell you to throw your phone in a lake.
            Technology is beautiful. The internet connects us across oceans. Your phone can
            teach you a language, help you navigate a foreign city, let you see your
            grandmother's face from three thousand miles away. The phone isn't the enemy.
            The autopilot is.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            The goal isn't zero screen time. The goal is intentional screen time. Knowing
            when you pick up your phone and why. Deciding how long you'll spend instead of
            letting the algorithm decide for you. Taking back control of your digital
            wellbeing. Not by deprivation, but by awareness.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            A friend of mine started tracking her screen time last year. She didn't set any
            rules at first. She just looked at the numbers. "It was like stepping on a scale
            after avoiding it for a year," she told me. "Uncomfortable. But clarifying."
            Within three weeks, without any dramatic lifestyle changes, her daily average
            dropped by ninety minutes. Just from paying attention.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            That's ninety minutes a day. Ten and a half hours a week. Five hundred and
            forty-seven hours a year. Imagine what you could build with that time. What
            you could learn. Who you could become.
          </p>
        </Prose>
      </section>

      <StatCallout number="547 hrs" label="Saved per year by reducing just 90 minutes a day" />

      <Divider />

      {/* ── Chapter 7: The Person You're Becoming ── */}
      <section className="max-w-3xl mx-auto px-6">
        <SectionHeading>
          Your future self<br />
          <span className="text-caramel">is watching</span>
        </SectionHeading>

        <Prose>
          <p>
            There's a version of you twelve months from now. That person has either spent
            another fifteen hundred hours on autopilot. Or they've reclaimed those hours
            and poured them into something real. A skill. A relationship. A project. A
            calmer, more present way of moving through the world.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            Both versions of you start from the same place: right here. Right now. The
            difference isn't talent, or discipline, or some superhuman ability to resist
            temptation. The difference is a system. A way to see your phone habits clearly,
            set a limit that matters, and have something real at stake when you slip.
          </p>
        </Prose>

        <PullQuote author="Marcus Aurelius, Meditations">
{`Think of yourself as dead.
You have lived your life.
Now, take what's left
and live it properly.`}
        </PullQuote>

        <Prose>
          <p>
            You don't need to be perfect. You don't need to go cold turkey. You just need
            to start. Track one week of screen time. Look at the numbers honestly. Set one
            small goal. Put something on the line. And then watch what happens when you
            stop fighting the algorithm with willpower and start fighting it with a system
            designed for the way your brain actually works.
          </p>
        </Prose>

        <Prose>
          <p className="mt-8">
            The quiet war for your attention is real. But you don't have to win it all at
            once. You just have to win today.
          </p>
        </Prose>
      </section>

      <Divider />

      {/* ── Closing CTA ── */}
      <section className="reveal py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-surface-card to-surface-light rounded-3xl border border-border p-10 md:p-14 relative overflow-hidden">
            <div className="hero-glow text-caramel absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 opacity-[0.08]" />
            <div className="relative z-10">
              <p className="text-muted text-sm mb-4">Ready to see your numbers?</p>
              <h3 className="text-2xl md:text-3xl font-bold text-cream mb-6 leading-snug">
                Start tracking your screen time.<br />
                <span className="text-caramel">No judgment. Just clarity.</span>
              </h3>
              <Link
                to="/auth"
                className="inline-block px-8 py-3.5 rounded-full bg-caramel text-surface font-bold hover:bg-caramel-light transition-all shadow-lg shadow-caramel/20 animate-glow"
              >
                Get Started, Free
              </Link>
              <p className="mt-5 text-xs text-muted/50">
                No credit card · Takes 30 seconds
              </p>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

/* ══════════════════════════════════════════════════════
   BLOG INDEX & LAYOUT
   ══════════════════════════════════════════════════════ */

const POSTS = [
  {
    slug: "screen-time-under-control",
    title: "The Quiet War for Your Attention",
    subtitle: "Why keeping your screen time under control is the most important battle you didn't know you were fighting.",
    tags: ["Screen Time", "Digital Wellbeing", "Phone Addiction"],
    date: "Feb 2026",
    readTime: "12 min",
    component: PostScreenTime,
  },
];

/* ── Blog index (listing) ── */
function BlogIndex() {
  return (
    <section className="max-w-3xl mx-auto px-6 pt-12 md:pt-20 pb-24">
      <div className="text-center mb-16 reveal">
        <p className="text-caramel text-xs tracking-[0.3em] uppercase mb-4">Journal</p>
        <h1 className="text-4xl md:text-5xl font-bold text-cream leading-tight">
          Thoughts on <span className="text-caramel">Time Well Spent</span>
        </h1>
        <p className="text-muted mt-4 max-w-md mx-auto">
          Essays on screen time, digital wellbeing, focus, and the art of living with intention.
        </p>
      </div>

      <div className="space-y-6">
        {POSTS.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="reveal block group bg-surface-card/50 hover:bg-surface-card border border-border hover:border-caramel/30 rounded-2xl p-8 md:p-10 transition-all"
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span key={tag} className="text-[11px] tracking-wider uppercase text-caramel/60 bg-caramel/[0.06] px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-cream group-hover:text-caramel transition-colors leading-snug mb-3">
              {post.title}
            </h2>
            <p className="text-muted text-sm md:text-base leading-relaxed mb-6">
              {post.subtitle}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted/60">
              <span>{post.date}</span>
              <span className="w-1 h-1 rounded-full bg-muted/30" />
              <span>{post.readTime} read</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── Main Blog page ── */
export default function Blog() {
  const pageRef = useReveal();
  const slug = window.location.pathname.split("/blog/")[1];
  const post = slug ? POSTS.find((p) => p.slug === slug) : null;
  const PostComponent = post?.component;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  return (
    <div ref={pageRef} className="min-h-screen bg-surface text-cream overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto relative z-10">
        <Link to="/">
          <LogoText size={30} />
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/blog" className="text-sm text-muted hover:text-cream transition hidden sm:block">
            Journal
          </Link>
          <Link
            to="/auth"
            className="text-sm px-5 py-2 rounded-full bg-caramel text-surface font-medium hover:bg-caramel-light transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Content */}
      {PostComponent ? <PostComponent /> : <BlogIndex />}

      {/* Footer */}
      <footer className="border-t border-border py-10 mt-12">
        <div className="max-w-5xl mx-auto px-8 flex flex-col items-center gap-6">
          <LogoText size={24} />
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted">
            <Link to="/" className="hover:text-cream transition">Home</Link>
            <Link to="/blog" className="hover:text-cream transition">Journal</Link>
            <Link to="/privacy" className="hover:text-cream transition">Privacy</Link>
            <Link to="/terms" className="hover:text-cream transition">Terms</Link>
            <a href="mailto:ifundfocus@gmail.com" className="hover:text-cream transition">Contact</a>
          </div>
          <div className="flex gap-5">
            <a href="https://x.com/fscreentime" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="text-muted hover:text-cream transition">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://instagram.com/fscreentime" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted hover:text-cream transition">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://tiktok.com/@fscreentime" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-muted hover:text-cream transition">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.17V11.7a4.83 4.83 0 01-3.77-1.24V6.69h3.77z"/></svg>
            </a>
          </div>
          <p className="text-xs text-muted/60">© {new Date().getFullYear()} fScreentime</p>
        </div>
      </footer>
    </div>
  );
}
