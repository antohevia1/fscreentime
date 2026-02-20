export default function Ranking() {
  return (
    <div className="flex items-center justify-center min-h-[75vh]">
      <div className="max-w-lg w-full text-center relative">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-caramel/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 bg-surface-card border border-border rounded-3xl p-10 md:p-14 overflow-hidden">
          {/* Animated bars background */}
          <div className="absolute inset-0 flex items-end justify-center gap-2 px-8 pb-6 opacity-[0.06] pointer-events-none">
            {[70, 55, 90, 40, 80, 60, 45, 85, 50, 75, 65, 95].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-caramel" style={{ height: `${h}%` }} />
            ))}
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-caramel/20 to-accent/10 border border-caramel/20 mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c4956a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15l-2 5h4l-2-5z" />
                <circle cx="12" cy="9" r="6" />
                <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
              </svg>
            </div>

            <span className="inline-block text-[10px] uppercase tracking-[0.2em] text-caramel border border-caramel/20 rounded-full px-3 py-1 mb-5">
              Coming Soon
            </span>

            <h2 className="text-3xl md:text-4xl font-bold text-cream mb-4 leading-tight">
              The leaderboard<br />is almost here.
            </h2>

            <p className="text-muted leading-relaxed mb-8 max-w-sm mx-auto">
              Compete with friends. See who reclaims the most time.
              Climb the ranks. Accountability through friendly rivalry.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { pos: '1st', name: '???', color: 'text-caramel' },
                { pos: '2nd', name: '???', color: 'text-caramel-light' },
                { pos: '3rd', name: '???', color: 'text-muted' },
              ].map((p, i) => (
                <div key={i} className="bg-surface/60 border border-border/50 rounded-xl p-3">
                  <p className={`text-lg font-bold ${p.color}`}>{p.pos}</p>
                  <p className="text-xs text-muted mt-1">{p.name}</p>
                  <div className="w-full h-1 bg-surface-light rounded-full mt-2">
                    <div className="h-full rounded-full bg-caramel/40 animate-pulse" style={{ width: `${90 - i * 20}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-cream/70">
              Will <span className="text-caramel font-semibold">you</span> be #1?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
