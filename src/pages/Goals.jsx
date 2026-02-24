import { useState, useMemo, useRef } from 'react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import { parseScreenTimeData } from '../utils/parseData';
import { useAuth } from '../context/AuthContext';
import StripePayment from '../components/StripePayment';

const CHARITIES = [
  { id: 'redcross', name: 'Red Cross', emoji: '🏥', desc: 'Disaster relief and humanitarian aid worldwide' },
  { id: 'msf', name: 'Doctors Without Borders', emoji: '⚕️', desc: 'Medical care in conflict zones and emergencies' },
  { id: 'unicef', name: 'UNICEF', emoji: '🧒', desc: 'Protecting children and their rights globally' },
  { id: 'wwf', name: 'World Wildlife Fund', emoji: '🐼', desc: 'Conservation of nature and endangered species' },
  { id: 'habitat', name: 'Habitat for Humanity', emoji: '🏠', desc: 'Building homes for families in need' },
  { id: 'feeding', name: 'Feeding America', emoji: '🍎', desc: 'Fighting hunger across the United States' },
  { id: 'stjude', name: "St. Jude Children's Hospital", emoji: '💛', desc: 'Pediatric treatment and research' },
];

const VIVID = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F97316', '#06B6D4', '#EC4899'];

const darkChart = {
  chart: { toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#9a8e80', background: 'transparent' },
  grid: { borderColor: '#3e3830', strokeDashArray: 3 },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark' },
};

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Challenge runs Mon→Sun. Start = tomorrow (or next Monday if today is Sunday).
// End = the following Sunday.
function getChallengeRange() {
  const now = new Date();
  const today = now.getDay(); // 0=Sun
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  let start, end;
  if (today === 0) {
    // Today is Sunday: start next Monday
    start = new Date(now);
    start.setDate(now.getDate() + 1);
  } else {
    // Start tomorrow
    start = tomorrow;
  }
  // End = next Sunday (day 0)
  end = new Date(start);
  const daysUntilSunday = (7 - start.getDay()) % 7;
  end.setDate(start.getDate() + (daysUntilSunday === 0 ? 6 : daysUntilSunday));

  const numDays = Math.round((end - start) / 86400000) + 1;
  return { startStr: toDateStr(start), endStr: toDateStr(end), numDays };
}

const API_URL = import.meta.env.VITE_API_URL;

export default function Goals({ data }) {
  const { user } = useAuth();

  const [goal, setGoal] = useState(() => {
    const saved = localStorage.getItem('st_goal');
    return saved ? JSON.parse(saved) : null;
  });

  const [dailyLimit, setDailyLimit] = useState(2);
  const [selectedCharity, setSelectedCharity] = useState('redcross');
  const [showInfo, setShowInfo] = useState(false);
  const charityRef = useRef(null);

  // Payment flow state
  const [paymentStep, setPaymentStep] = useState(null); // null | 'loading' | 'card_entry' | 'error'
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const pendingGoalRef = useRef(null);

  const range = getChallengeRange();
  const weeklyBudget = +(dailyLimit * range.numDays).toFixed(1);

  // Activate the goal: save to backend + localStorage
  const activateGoal = async (g) => {
    try {
      await axios.post(`${API_URL}/goals`, {
        ...g,
        identityId: user?.identityId,
        status: 'active',
      }, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
    } catch (err) {
      console.error('Failed to save goal to backend:', err);
    }

    localStorage.setItem('st_goal', JSON.stringify(g));
    setGoal(g);
    setPaymentStep(null);
  };

  // "Accept Challenge" → create setup intent → show card form (or skip if card on file)
  const saveGoal = async (e) => {
    e.preventDefault();
    const charity = CHARITIES.find(c => c.id === selectedCharity);
    const g = {
      dailyLimit,
      weeklyLimit: weeklyBudget,
      charity: charity.name,
      charityId: charity.id,
      amount: 10,
      createdAt: new Date().toISOString(),
      weekStart: range.startStr,
      weekEnd: range.endStr,
      numDays: range.numDays,
    };

    pendingGoalRef.current = g;
    setPaymentStep('loading');
    setPaymentError(null);

    try {
      const resp = await axios.post(`${API_URL}/create-setup-intent`, {
        email: user?.email,
      }, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      if (resp.data.already_setup) {
        await activateGoal(g);
      } else {
        setClientSecret(resp.data.client_secret);
        setPaymentStep('card_entry');
      }
    } catch (err) {
      console.error('Setup intent error:', err);
      setPaymentError('Failed to initialize payment. Please try again.');
      setPaymentStep('error');
    }
  };

  const handlePaymentSuccess = async () => {
    if (pendingGoalRef.current) {
      await activateGoal(pendingGoalRef.current);
    }
  };

  const handlePaymentError = (err) => {
    setPaymentError(err.message || 'Payment setup failed');
  };

  const clearGoal = () => { localStorage.removeItem('st_goal'); setGoal(null); };

  // ── Payment loading spinner ─────────────────────────────────
  if (paymentStep === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-surface-card border border-border rounded-xl p-8 max-w-lg w-full text-center">
          <div className="animate-pulse">
            <span className="text-4xl block mb-4">💳</span>
            <p className="text-cream">Setting up payment...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Card entry step (Stripe Elements) ───────────────────────
  if (paymentStep === 'card_entry' && clientSecret) {
    const charity = CHARITIES.find(c => c.id === selectedCharity);
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-surface-card border border-border rounded-xl p-8 max-w-lg w-full">
          <h2 className="text-xl font-semibold text-cream mb-2">Skin in the Game</h2>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Add your card to activate the challenge. You won't be charged now — only if you fail your weekly goal.
          </p>

          <div className="bg-surface-light rounded-lg p-4 border border-border mb-6 space-y-2">
            <p className="text-sm text-muted">If you exceed <span className="text-cream">{weeklyBudget}h</span> this period:</p>
            <p className="text-caramel font-semibold">$10.00 → {charity?.name}</p>
            <div className="flex gap-4 text-xs text-muted pt-1 border-t border-border/50">
              <span>Donation: <span className="text-cream">$9.00</span></span>
              <span>Service fee (10%): <span className="text-cream">$1.00</span></span>
            </div>
          </div>

          <StripePayment
            clientSecret={clientSecret}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />

          <button
            onClick={() => { setPaymentStep(null); setClientSecret(null); }}
            className="w-full mt-3 py-2 text-sm text-muted hover:text-cream transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Payment error ───────────────────────────────────────────
  if (paymentStep === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-surface-card border border-border rounded-xl p-8 max-w-lg w-full text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <p className="text-red-400 mb-4">{paymentError}</p>
          <button
            onClick={() => { setPaymentStep(null); setPaymentError(null); }}
            className="py-2 px-6 rounded-lg bg-caramel text-surface font-semibold text-sm hover:bg-caramel-light transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Goal setup form ─────────────────────────────────────────
  if (!goal) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-surface-card border border-border rounded-xl p-8 max-w-lg w-full">
          <h2 className="text-xl font-semibold text-cream mb-2">Set Your Weekly Challenge</h2>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Choose a daily screen time limit. Your budget for this period is <span className="text-caramel">{weeklyBudget}h</span> ({range.numDays} days).
            Miss it, and your $10 goes to charity.
          </p>

          {/* Challenge period */}
          <div className="bg-surface-light rounded-lg p-3 border border-border mb-5 flex items-center justify-center gap-2">
            <div className="text-center flex-1">
              <p className="text-xs text-muted uppercase tracking-wide">Challenge period</p>
              <p className="text-sm text-cream mt-1">{fmtDate(range.startStr)} → {fmtDate(range.endStr)}</p>
              <p className="text-xs text-muted mt-0.5">{range.numDays} days</p>
            </div>
            <button type="button" onClick={() => setShowInfo(!showInfo)}
              className="w-6 h-6 rounded-full border border-border text-muted hover:text-cream hover:border-caramel/40 text-xs flex items-center justify-center shrink-0 transition"
              aria-label="Challenge info">?</button>
          </div>
          {showInfo && (
            <div className="bg-surface rounded-lg p-4 border border-border mb-5 text-sm text-muted leading-relaxed space-y-2">
              <p>Challenges follow a <span className="text-cream">Monday to Sunday</span> weekly cycle.</p>
              <p>Goal compliance is checked on Monday after the challenge week ends.</p>
              <p>If you start mid week, tracking begins the next day and your budget is prorated. For example, with a 2h daily limit and 5 days remaining, your target is 10h.</p>
              <p>Goals set on Sunday start the following Monday for a full 7 day week.</p>
            </div>
          )}

          <form onSubmit={saveGoal} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted block mb-2">Daily limit (hours)</label>
              <input type="range" min={0.5} max={8} step={0.5} value={dailyLimit}
                onChange={e => setDailyLimit(+e.target.value)}
                className="w-full accent-caramel" />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted">0.5h</span>
                <span className="text-caramel font-semibold text-lg">{dailyLimit}h / day</span>
                <span className="text-muted">8h</span>
              </div>
              <p className="text-center text-sm text-muted mt-1">Period budget: <span className="text-cream">{weeklyBudget}h</span></p>
            </div>

            {/* Charity cards with arrows */}
            <div>
              <label className="text-xs uppercase tracking-wide text-muted block mb-3">Choose a charity</label>
              <div className="relative">
                <button type="button" onClick={() => charityRef.current?.scrollBy({ left: -152, behavior: 'smooth' })}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-7 h-7 rounded-full bg-surface-card border border-border text-muted hover:text-cream hover:border-caramel/40 flex items-center justify-center text-sm transition">‹</button>
                <div ref={charityRef} className="flex gap-3 overflow-x-auto pb-2 px-1 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
                  {CHARITIES.map(c => (
                    <button type="button" key={c.id} onClick={() => setSelectedCharity(c.id)}
                      className={`shrink-0 w-36 rounded-xl p-4 border text-left transition ${
                        selectedCharity === c.id
                          ? 'border-caramel bg-surface-hover'
                          : 'border-border bg-surface-light hover:border-caramel/30'
                      }`}>
                      <span className="text-2xl block mb-2">{c.emoji}</span>
                      <p className="text-xs font-semibold text-cream leading-tight">{c.name}</p>
                      <p className="text-[10px] text-muted mt-1 leading-snug">{c.desc}</p>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => charityRef.current?.scrollBy({ left: 152, behavior: 'smooth' })}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-7 h-7 rounded-full bg-surface-card border border-border text-muted hover:text-cream hover:border-caramel/40 flex items-center justify-center text-sm transition">›</button>
              </div>
            </div>

            <div className="bg-surface-light rounded-lg p-4 border border-border space-y-2">
              <p className="text-sm text-muted">If you exceed <span className="text-cream">{weeklyBudget}h</span> this period:</p>
              <p className="text-caramel font-semibold">$10.00 → {CHARITIES.find(c => c.id === selectedCharity)?.name}</p>
              <div className="flex gap-4 text-xs text-muted pt-1 border-t border-border/50">
                <span>Donation: <span className="text-cream">$9.00</span></span>
                <span>Service fee (10%): <span className="text-cream">$1.00</span></span>
              </div>
            </div>
            <button type="submit"
              className="w-full py-3 rounded-lg bg-caramel text-surface font-semibold text-sm hover:bg-caramel-light transition">
              Accept Challenge
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <GoalProgress goal={goal} data={data} onClear={clearGoal} />;
}

function GoalProgress({ goal, data, onClear }) {
  const parsed = useMemo(() => data ? parseScreenTimeData(data) : [], [data]);

  const stats = useMemo(() => {
    const r = getChallengeRange();
    const weekStart = goal.weekStart || r.startStr;
    const weekEnd = goal.weekEnd || r.endStr;
    const weekData = parsed.filter(d => d.date >= weekStart && d.date <= weekEnd);
    const weekMinutes = weekData.reduce((s, d) => s + d.minutes, 0);
    const weekHours = weekMinutes / 60;
    const goalHours = goal.weeklyLimit;
    const remaining = Math.max(0, goalHours - weekHours);
    const overBy = Math.max(0, weekHours - goalHours);
    const pct = Math.min(100, (weekHours / goalHours) * 100);
    const onTrack = weekHours <= goalHours;

    const numDays = goal.numDays || 7;
    const daily = [];
    const [y, m, d0] = weekStart.split('-').map(Number);
    for (let i = 0; i < numDays; i++) {
      const d = new Date(y, m - 1, d0 + i);
      const dateStr = toDateStr(d);
      const dayMin = weekData.filter(e => e.date === dateStr).reduce((s, e) => s + e.minutes, 0);
      daily.push({ date: dateStr, hours: +(dayMin / 60).toFixed(2), limit: goal.dailyLimit });
    }

    const appMap = {};
    weekData.forEach(d => { appMap[d.app] = (appMap[d.app] || 0) + d.minutes; });
    const apps = Object.entries(appMap).sort((a, b) => b[1] - a[1]).slice(0, 7);

    return { weekHours, goalHours, remaining, overBy, pct, onTrack, daily, apps };
  }, [parsed, goal]);

  const gaugeOpts = {
    series: [Math.round(stats.pct)],
    options: {
      ...darkChart,
      chart: { ...darkChart.chart, type: 'radialBar' },
      plotOptions: {
        radialBar: {
          startAngle: -135, endAngle: 135,
          hollow: { size: '65%' },
          track: { background: '#3e3830' },
          dataLabels: {
            name: { show: true, fontSize: '13px', color: '#9a8e80', offsetY: -10 },
            value: { show: true, fontSize: '28px', fontWeight: 700, color: stats.onTrack ? '#4ECDC4' : '#FF6B6B', offsetY: 5, formatter: () => `${stats.weekHours.toFixed(1)}h` },
          },
        },
      },
      labels: [`of ${stats.goalHours}h`],
      colors: [stats.onTrack ? '#4ECDC4' : '#FF6B6B'],
    },
  };

  const dailyChart = {
    series: [
      { name: 'Usage', data: stats.daily.map(d => d.hours) },
      { name: 'Limit', data: stats.daily.map(d => d.limit) },
    ],
    options: {
      ...darkChart,
      chart: { ...darkChart.chart, type: 'bar' },
      xaxis: { categories: stats.daily.map(d => new Date(d.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })) },
      yaxis: { title: { text: 'Hours', style: { color: '#9a8e80' } } },
      colors: ['#4ECDC4', '#3e3830'],
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
      legend: { position: 'top', labels: { colors: '#9a8e80' } },
      tooltip: { y: { formatter: v => `${v.toFixed(1)}h` } },
    },
  };

  const donutChart = {
    series: stats.apps.map(([, v]) => Math.round(v)),
    options: {
      ...darkChart,
      chart: { ...darkChart.chart, type: 'donut' },
      labels: stats.apps.map(([k]) => k),
      colors: VIVID,
      legend: { position: 'bottom', labels: { colors: '#9a8e80' } },
      plotOptions: { pie: { donut: { size: '60%' } } },
      tooltip: { y: { formatter: v => `${(v / 60).toFixed(1)}h` } },
    },
  };

  const stakeAmount = goal.amount || 10;
  const hasData = stats.weekHours > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cream">Weekly Challenge</h2>
          <p className="text-sm text-muted mt-1">
            {fmtDate(goal.weekStart)} → {fmtDate(goal.weekEnd)} · {goal.numDays || 7} days · {goal.dailyLimit}h/day · {goal.weeklyLimit}h total · ${stakeAmount} → {goal.charity}
          </p>
          <p className="text-xs text-muted mt-0.5">Donation: ${(stakeAmount * 0.9).toFixed(2)} · Service fee (10%): ${(stakeAmount * 0.1).toFixed(2)}</p>
        </div>
        <button onClick={onClear}
          className="text-xs text-muted hover:text-cream border border-border rounded-lg px-3 py-1.5 hover:border-caramel/40 transition">
          Reset Goal
        </button>
      </div>

      {!hasData && (
        <div className="bg-surface-card border border-border rounded-2xl p-10 text-center">
          <span className="text-5xl block mb-4">🚀</span>
          <h3 className="text-xl font-semibold text-cream mb-2">Challenge accepted!</h3>
          <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
            Your tracking starts <span className="text-caramel">{fmtDate(goal.weekStart)}</span>.
            Come back tomorrow to see your first stats. In the meantime, enjoy your screen free evening.
          </p>
        </div>
      )}

      {hasData && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Used', value: `${stats.weekHours.toFixed(1)}h`, color: 'text-cream' },
          { label: 'Budget', value: `${stats.goalHours}h`, color: 'text-caramel' },
          { label: 'Remaining', value: stats.onTrack ? `${stats.remaining.toFixed(1)}h` : `Over by ${stats.overBy.toFixed(1)}h`, color: stats.onTrack ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Stake', value: stats.onTrack ? 'Safe ✓' : `$${stakeAmount} → ${goal.charity}`, color: stats.onTrack ? 'text-emerald-400' : 'text-red-400' },
        ].map((s, i) => (
          <div key={i} className="bg-surface-card border border-border rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
            <p className={`text-lg font-semibold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-surface-card border border-border rounded-xl p-5 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-cream mb-2 self-start">Progress</h3>
          <Chart options={gaugeOpts.options} series={gaugeOpts.series} type="radialBar" height={280} width={280} />
        </div>
        <div className="bg-surface-card border border-border rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-medium text-cream mb-2">Daily vs Limit</h3>
          <Chart options={dailyChart.options} series={dailyChart.series} type="bar" height={280} />
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-cream mb-2">This Week by App</h3>
        <Chart options={donutChart.options} series={donutChart.series} type="donut" height={300} />
      </div>
      </>}
    </div>
  );
}
