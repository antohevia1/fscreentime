import { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { parseScreenTimeData } from '../utils/parseData';

const CHARITIES = [
  'Red Cross', 'Doctors Without Borders', 'UNICEF', 'World Wildlife Fund',
  'Habitat for Humanity', 'Feeding America', "St. Jude Children's Hospital",
];

const VIVID = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F97316', '#06B6D4', '#EC4899'];

const darkChart = {
  chart: { toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#9a8e80', background: 'transparent' },
  grid: { borderColor: '#3e3830', strokeDashArray: 3 },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark' },
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end, startStr: start.toISOString().split('T')[0], endStr: end.toISOString().split('T')[0] };
}

export default function Goals({ data }) {
  const [goal, setGoal] = useState(() => {
    const saved = localStorage.getItem('st_goal');
    return saved ? JSON.parse(saved) : null;
  });

  const [dailyLimit, setDailyLimit] = useState(2);
  const [charity, setCharity] = useState(CHARITIES[0]);

  const saveGoal = (e) => {
    e.preventDefault();
    const week = getWeekRange();
    const g = {
      dailyLimit, weeklyLimit: dailyLimit * 7, charity, amount: 5,
      createdAt: new Date().toISOString(),
      weekStart: week.startStr, weekEnd: week.endStr,
    };
    localStorage.setItem('st_goal', JSON.stringify(g));
    setGoal(g);
  };

  const clearGoal = () => { localStorage.removeItem('st_goal'); setGoal(null); };

  if (!goal) {
    const week = getWeekRange();
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-surface-card border border-border rounded-xl p-8 max-w-md w-full">
          <h2 className="text-xl font-semibold text-cream mb-2">Set Your Weekly Challenge</h2>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Choose a daily screen time limit. You will have a weekly budget of <span className="text-caramel">{dailyLimit * 7}h</span>.
            Miss it, and your $5 goes to charity. Beat it, and you keep your time and your money.
          </p>
          <div className="bg-surface-light rounded-lg p-3 border border-border mb-5 text-center">
            <p className="text-xs text-muted uppercase tracking-wide">Challenge period</p>
            <p className="text-sm text-cream mt-1">{formatDate(week.startStr)} → {formatDate(week.endStr)}</p>
          </div>
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
              <p className="text-center text-sm text-muted mt-1">Weekly budget: <span className="text-cream">{dailyLimit * 7}h</span></p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted block mb-2">Charity</label>
              <select value={charity} onChange={e => setCharity(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-surface-light border border-border text-cream text-sm focus:outline-none focus:border-caramel/60">
                {CHARITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bg-surface-light rounded-lg p-4 border border-border">
              <p className="text-sm text-muted">If you exceed <span className="text-cream">{dailyLimit * 7}h</span> this week:</p>
              <p className="text-caramel font-semibold mt-1">$5.00 → {charity}</p>
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
    const week = getWeekRange();
    const weekStart = goal.weekStart || week.startStr;
    const weekEnd = goal.weekEnd || week.endStr;
    const weekData = parsed.filter(d => d.date >= weekStart && d.date <= weekEnd);
    const weekMinutes = weekData.reduce((s, d) => s + d.minutes, 0);
    const weekHours = weekMinutes / 60;
    const goalHours = goal.weeklyLimit;
    const remaining = Math.max(0, goalHours - weekHours);
    const overBy = Math.max(0, weekHours - goalHours);
    const pct = Math.min(100, (weekHours / goalHours) * 100);
    const onTrack = weekHours <= goalHours;

    // Build all 7 days of the week
    const daily = [];
    const weekStartStr = goal.weekStart || new Date(goal.createdAt).toISOString().split('T')[0];
    const [y, m, day0] = weekStartStr.split('-').map(Number);
    for (let i = 0; i < 7; i++) {
      const d = new Date(y, m - 1, day0 + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      xaxis: { categories: stats.daily.map(d => new Date(d.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })) },
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cream">Weekly Challenge</h2>
          <p className="text-sm text-muted mt-1">
            {formatDate(goal.weekStart)} → {formatDate(goal.weekEnd)} · {goal.dailyLimit}h/day · {goal.weeklyLimit}h/week · $5 → {goal.charity}
          </p>
        </div>
        <button onClick={onClear}
          className="text-xs text-muted hover:text-cream border border-border rounded-lg px-3 py-1.5 hover:border-caramel/40 transition">
          Reset Goal
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Used', value: `${stats.weekHours.toFixed(1)}h`, color: 'text-cream' },
          { label: 'Budget', value: `${stats.goalHours}h`, color: 'text-caramel' },
          { label: 'Remaining', value: stats.onTrack ? `${stats.remaining.toFixed(1)}h` : `Over by ${stats.overBy.toFixed(1)}h`, color: stats.onTrack ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Stake', value: stats.onTrack ? 'Safe ✓' : `$5 → ${goal.charity}`, color: stats.onTrack ? 'text-emerald-400' : 'text-red-400' },
        ].map((s, i) => (
          <div key={i} className="bg-surface-card border border-border rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
            <p className={`text-lg font-semibold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
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
    </div>
  );
}
