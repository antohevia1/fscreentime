import { useState, useMemo, useCallback, useRef } from 'react';
import Chart from 'react-apexcharts';
import { parseScreenTimeData } from '../utils/parseData';
import ContributionsChart from './ContributionsChart';
import { useAuth } from '../context/AuthContext';

const VIVID = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F97316', '#06B6D4', '#EC4899', '#84CC16', '#F43F5E', '#8B5CF6'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const darkChart = {
  chart: { toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#9a8e80', background: 'transparent' },
  grid: { borderColor: '#3e3830', strokeDashArray: 3 },
  dataLabels: { enabled: false },
  legend: { position: 'bottom', fontSize: '12px', labels: { colors: '#9a8e80' } },
  tooltip: { theme: 'dark' },
};

function Dashboard({ data }) {
  const parsed = useMemo(() => parseScreenTimeData(data), [data]);
  const appNames = useMemo(() => [...new Set(parsed.map(d => d.app))].sort(), [parsed]);

  const [timeframe, setTimeframe] = useState('7d');
  const [selectedApp, setSelectedApp] = useState('all');

  // Legend click handler: set page level app filter
  const onLegendClick = useCallback((appName) => {
    setSelectedApp(prev => prev === appName ? 'all' : appName);
  }, []);

  const fmt = m => `${(m / 60).toFixed(1)}h`;
  const ttFmt = v => `${v.toFixed(1)}h`;

  // For the DoW chart we use a custom legend so clicking filters data rather than toggling series visibility
  const dowChart = useMemo(() => {
    // Use ALL time-filtered data (not app-filtered) so all apps appear in the legend
    let base = parsed;
    if (timeframe !== 'all') {
      const days = timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : timeframe === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      base = base.filter(d => d.date >= cutoff);
    }
    const allApps = [...new Set(base.map(d => d.app))].slice(0, 10);
    const map = {};
    base.forEach(d => {
      const dow = new Date(d.date).getDay();
      if (!map[dow]) map[dow] = {};
      if (!map[dow][d.app]) map[dow][d.app] = { total: 0, count: 0 };
      map[dow][d.app].total += d.minutes;
      map[dow][d.app].count++;
    });
    // When an app is selected, show only that app's series; others become transparent
    return {
      apps: allApps,
      series: allApps.map((app, i) => ({
        name: app,
        data: DAY_NAMES.map((_, idx) => { const e = map[idx]?.[app]; return e ? +(e.total / e.count / 60).toFixed(2) : 0; }),
        color: selectedApp === 'all' || selectedApp === app ? VIVID[i % VIVID.length] : '#3e3830',
      })),
      options: {
        ...darkChart,
        chart: { ...darkChart.chart, type: 'bar', events: {} },
        xaxis: { categories: DAY_NAMES },
        yaxis: { title: { text: 'Avg Hours', style: { color: '#9a8e80' } } },
        plotOptions: { bar: { columnWidth: '65%', borderRadius: 2 } },
        tooltip: { y: { formatter: ttFmt } },
        legend: { show: false }, // custom legend below
      },
    };
  }, [parsed, timeframe, selectedApp]);

  const filtered = useMemo(() => {
    let result = parsed;
    if (timeframe !== 'all') {
      const days = timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : timeframe === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      result = result.filter(d => d.date >= cutoff);
    }
    if (selectedApp !== 'all') result = result.filter(d => d.app === selectedApp);
    return result;
  }, [parsed, timeframe, selectedApp]);

  const summary = useMemo(() => {
    const totalMinutes = filtered.reduce((s, d) => s + d.minutes, 0);
    const dates = [...new Set(filtered.map(d => d.date))];
    const avgDaily = dates.length ? totalMinutes / dates.length : 0;
    // Use filtered data (respects app filter) for last week / prev week
    const allDates = [...new Set(filtered.map(d => d.date))].sort();
    let change = null, lastWeekMin = 0;
    if (allDates.length >= 7) {
      const last7 = allDates.slice(-7);
      const prev7 = allDates.slice(-14, -7);
      lastWeekMin = filtered.filter(d => last7.includes(d.date)).reduce((s, d) => s + d.minutes, 0);
      const prevMin = filtered.filter(d => prev7.includes(d.date)).reduce((s, d) => s + d.minutes, 0);
      if (prevMin) change = ((lastWeekMin - prevMin) / prevMin * 100).toFixed(1);
    }
    return { totalMinutes, avgDaily, lastWeekMin, change };
  }, [filtered]);

  const areaChart = useMemo(() => {
    // Use time-filtered but NOT app-filtered data so all apps appear
    let base = parsed;
    if (timeframe !== 'all') {
      const days = timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : timeframe === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      base = base.filter(d => d.date >= cutoff);
    }
    const dates = [...new Set(base.map(d => d.date))].sort();
    const apps = [...new Set(base.map(d => d.app))].slice(0, 10);
    const map = {};
    base.forEach(d => { map[`${d.date}|${d.app}`] = (map[`${d.date}|${d.app}`] || 0) + d.minutes; });
    return {
      apps,
      series: apps.map((app, i) => ({
        name: app,
        data: dates.map(dt => +((map[`${dt}|${app}`] || 0) / 60).toFixed(2)),
        color: selectedApp === 'all' || selectedApp === app ? VIVID[i % VIVID.length] : '#3e3830',
      })),
      options: {
        ...darkChart,
        chart: { ...darkChart.chart, type: 'area', stacked: true, events: {} },
        xaxis: { categories: dates, labels: { rotate: -45, rotateAlways: dates.length > 14 } },
        yaxis: { title: { text: 'Hours', style: { color: '#9a8e80' } } },
        stroke: { curve: 'smooth', width: 1 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
        tooltip: { y: { formatter: ttFmt } },
        legend: { show: false },
      },
    };
  }, [parsed, timeframe, selectedApp]);

  const hBarChart = useMemo(() => {
    const map = {};
    filtered.forEach(d => { map[d.app] = (map[d.app] || 0) + d.minutes; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 15);
    return {
      series: [{ name: 'Hours', data: sorted.map(([, v]) => +(v / 60).toFixed(2)) }],
      options: {
        ...darkChart,
        chart: {
          ...darkChart.chart, type: 'bar',
          events: {
            dataPointSelection: (e, ctx, config) => {
              const name = config?.w?.config?.labels?.[config.dataPointIndex];
              if (name) onLegendClick(name);
            },
          },
        },
        plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 2 } },
        xaxis: { title: { text: 'Total Hours', style: { color: '#9a8e80' } } },
        labels: sorted.map(([k]) => k),
        colors: ['#4ECDC4'],
        tooltip: { y: { formatter: ttFmt } },
      },
    };
  }, [filtered, onLegendClick]);

  const treemapChart = useMemo(() => {
    const map = {};
    filtered.forEach(d => { map[d.app] = (map[d.app] || 0) + d.minutes; });
    return {
      series: [{ data: Object.entries(map).map(([app, min]) => ({ x: app, y: Math.round(min) })).sort((a, b) => b.y - a.y) }],
      options: {
        ...darkChart,
        chart: {
          ...darkChart.chart, type: 'treemap',
          events: {
            dataPointSelection: (e, ctx, config) => {
              const item = config?.w?.config?.series?.[0]?.data?.[config.dataPointIndex];
              if (item?.x) onLegendClick(item.x);
            },
          },
        },
        colors: VIVID,
        plotOptions: { treemap: { distributed: true, enableShades: false } },
        dataLabels: { enabled: true, style: { fontSize: '14px', fontWeight: 600 }, formatter: (text, op) => `${text}` },
        tooltip: { y: { formatter: v => fmt(v) } },
      },
    };
  }, [filtered, onLegendClick]);

  const { user } = useAuth();
  if (!parsed.length) return (
    <DashboardEmpty
      userName={user?.alias || user?.email?.split('@')[0]}
      identityId={user?.identityId}
    />
  );

  const selectClass = 'text-sm border border-border rounded-lg px-3 py-1.5 bg-surface-card text-cream focus:outline-none focus:border-caramel/60';

  return (
    <div className="space-y-5">
      {/* Filters + Summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <select value={timeframe} onChange={e => setTimeframe(e.target.value)} aria-label="Timeframe" className={selectClass}>
          <option value="7d">This Week</option>
          <option value="14d">Last 14 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
        <select value={selectedApp} onChange={e => setSelectedApp(e.target.value)} aria-label="App filter" className={selectClass}>
          <option value="all">All Apps</option>
          {appNames.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {selectedApp !== 'all' && (
          <button onClick={() => setSelectedApp('all')} className="text-xs text-caramel hover:text-caramel-light transition">
            ✕ Clear filter
          </button>
        )}

        <div className="ml-auto flex flex-wrap gap-4">
          {[
            { label: 'Total', value: fmt(summary.totalMinutes) },
            { label: 'Daily Avg', value: fmt(summary.avgDaily) },
            { label: 'Last Week', value: fmt(summary.lastWeekMin) },
            { label: 'vs Prev', value: summary.change !== null ? `${summary.change > 0 ? '+' : ''}${summary.change}%` : '—', color: summary.change > 0 ? 'text-red-400' : 'text-emerald-400' },
          ].map((s, i) => (
            <div key={i} className="bg-surface-card border border-border rounded-lg px-4 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
              <p className={`text-lg font-semibold ${s.color || 'text-cream'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* DoW chart with custom legend */}
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-cream mb-2">Avg by Day of Week</h3>
          <Chart options={dowChart.options} series={dowChart.series} type="bar" height={280} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 justify-center">
            {dowChart.apps.map((app, i) => (
              <button key={app} onClick={() => onLegendClick(app)}
                className="flex items-center gap-1.5 text-xs transition"
                style={{ color: selectedApp === 'all' || selectedApp === app ? '#f5efe6' : '#3e3830' }}>
                <span className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: selectedApp === 'all' || selectedApp === app ? VIVID[i % VIVID.length] : '#3e3830' }} />
                {app}
              </button>
            ))}
          </div>
        </div>

        {/* Area chart with custom legend */}
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-cream mb-2">Usage Over Time</h3>
          <Chart options={areaChart.options} series={areaChart.series} type="area" height={280} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 justify-center">
            {areaChart.apps.map((app, i) => (
              <button key={app} onClick={() => onLegendClick(app)}
                className="flex items-center gap-1.5 text-xs transition"
                style={{ color: selectedApp === 'all' || selectedApp === app ? '#f5efe6' : '#3e3830' }}>
                <span className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: selectedApp === 'all' || selectedApp === app ? VIVID[i % VIVID.length] : '#3e3830' }} />
                {app}
              </button>
            ))}
          </div>
        </div>

        {[
          { title: 'Top Apps', chart: hBarChart, type: 'bar', h: 380 },
          { title: 'Time Distribution by App', chart: treemapChart, type: 'treemap', h: 320 },
        ].map((c, i) => (
          <div key={i} className="bg-surface-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-cream mb-2">{c.title}</h3>
            <Chart options={c.chart.options} series={c.chart.series} type={c.type} height={c.h} />
          </div>
        ))}
      </div>

      <ContributionsChart data={filtered} />
    </div>
  );
}

export default Dashboard;

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mt-5 rounded-xl border-2 border-caramel/40 bg-surface overflow-hidden">
      {/* Label bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-caramel/10 border-b border-caramel/20">
        <span className="text-caramel text-xs">
          {/* key icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.5" cy="15.5" r="5.5"/>
            <path d="M21 2l-9.6 9.6M15.5 7.5l3 3"/>
          </svg>
        </span>
        <span className="text-xs font-semibold text-caramel uppercase tracking-wider">
          Your Identity ID — paste this into the shortcut
        </span>
      </div>

      {/* ID + copy button */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="flex-1 font-mono text-xs text-cream truncate select-all">
          {value ?? 'Loading…'}
        </span>
        <button
          onClick={handleCopy}
          disabled={!value}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-caramel/15 text-caramel border border-caramel/30 hover:bg-caramel/25 active:scale-95'
          }`}
          aria-label="Copy Identity ID"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function DashboardEmpty({ userName, identityId }) {
  return (
    <div className="relative flex flex-col items-center px-4 py-8 md:py-16 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-glow text-caramel absolute" style={{ top: '20%', left: '30%', opacity: 0.09 }} />
      </div>

      <div className="relative z-10 w-full max-w-3xl">

        {/* Header */}
        <div className="text-center mb-7 md:mb-12">
          <div className="inline-flex w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-caramel-light to-caramel items-center justify-center mb-4 md:mb-6 shadow-lg shadow-caramel/25">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <path
                d="M14 10h12M14 30h12M14 10c0 5 6 8 6 10s-6 5-6 10M26 10c0 5-6 8-6 10s6 5 6 10"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="20" cy="24" r="2" fill="white" fillOpacity="0.7" />
            </svg>
          </div>

          {userName && (
            <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-caramel/70 mb-2 md:mb-3">
              Welcome, {userName}
            </p>
          )}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-cream mb-2 md:mb-3 leading-tight">
            Your dashboard is ready.
            <br />
            <span className="bg-gradient-to-r from-caramel via-accent to-caramel-light bg-clip-text text-transparent">
              Let's get you connected.
            </span>
          </h2>
          <p className="text-muted max-w-xs md:max-w-sm mx-auto text-xs md:text-sm leading-relaxed">
            Three quick steps on your iPhone and your data will start flowing in.
          </p>
        </div>

        {/* ── Desktop: 3-column card grid ── */}
        <div className="hidden md:grid md:grid-cols-3 relative gap-5 mb-10">
          {/* Connector line */}
          <div className="absolute top-[3.75rem] left-[calc(16.67%+1.25rem)] right-[calc(16.67%+1.25rem)] h-px bg-gradient-to-r from-border via-caramel/30 to-border z-0" />

          {/* Step 01 */}
          <div className="relative bg-surface-card rounded-2xl p-7 border border-border hover:border-caramel/30 transition-all duration-300 hover:shadow-lg hover:shadow-caramel/5 hover:-translate-y-0.5 z-10">
            <span className="text-xs font-mono text-caramel/50 mb-4 block">01</span>
            <div className="mb-5">
              <a href="https://apps.apple.com/app/shortcuts/id915249334" target="_blank" rel="noopener noreferrer" className="inline-block hover:scale-105 transition-transform">
                <div className="w-14 h-14 rounded-[18px] shadow-xl shadow-[#EF3E56]/20 overflow-hidden">
                  <img src="/shortcuss.webp" alt="Shortcuts app" className="w-full h-full object-cover" />
                </div>
              </a>
            </div>
            <h3 className="text-base font-semibold text-cream mb-2">Install Shortcuts</h3>
            <p className="text-sm text-muted leading-relaxed">
              Download{' '}
              <a href="https://apps.apple.com/app/shortcuts/id915249334" target="_blank" rel="noopener noreferrer" className="text-caramel hover:underline">Shortcuts</a>
              {' '}from the App Store. Pre-installed on iOS&nbsp;13+.
            </p>
          </div>

          {/* Step 02 */}
          <div className="relative bg-surface-card rounded-2xl p-7 border border-border hover:border-caramel/30 transition-all duration-300 hover:shadow-lg hover:shadow-caramel/5 hover:-translate-y-0.5 z-10">
            <span className="text-xs font-mono text-caramel/50 mb-4 block">02</span>
            <div className="mb-5">
              <div className="w-14 h-14 rounded-[18px] shadow-xl shadow-caramel/20 flex items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #d4aa80 0%, #c4956a 40%, #b07d52 100%)', transform: 'perspective(400px) rotateY(12deg) rotateX(6deg)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[18px]" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-cream mb-2">Add Our Automation</h3>
            <p className="text-sm text-muted leading-relaxed">Tap to install our shortcut. It runs daily and syncs your screen time automatically.</p>
          </div>

          {/* Step 03 */}
          <div className="relative bg-surface-card rounded-2xl p-7 border-2 border-caramel/40 shadow-lg shadow-caramel/10 z-10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-caramel text-surface text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md shadow-caramel/30 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />
              Do this now
            </div>
            <span className="text-xs font-mono text-caramel/50 mb-4 block mt-1">03</span>
            <div className="mb-5">
              <div className="w-14 h-14 rounded-[18px] shadow-xl shadow-[#A78BFA]/20 flex items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #c4b5fd 0%, #A78BFA 40%, #7C5FD3 100%)', transform: 'perspective(400px) rotateY(-12deg) rotateX(6deg)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[18px]" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-cream mb-2">Enter Your Identity ID</h3>
            <p className="text-sm text-muted leading-relaxed">When the shortcut runs for the first time it will ask for your ID. Copy yours below and paste it in.</p>
            <CopyField value={identityId} />
          </div>
        </div>

        {/* ── Mobile: compact step list ── */}
        <div className="md:hidden space-y-3 mb-7">

          {/* Step 01 — horizontal row */}
          <div className="flex items-center gap-4 bg-surface-card rounded-xl p-4 border border-border">
            <a href="https://apps.apple.com/app/shortcuts/id915249334" target="_blank" rel="noopener noreferrer" className="shrink-0">
              <div className="w-11 h-11 rounded-[12px] overflow-hidden shadow-lg shadow-[#EF3E56]/15">
                <img src="/shortcuss.webp" alt="Shortcuts app" className="w-full h-full object-cover" />
              </div>
            </a>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-caramel/50 shrink-0">01</span>
                <h3 className="text-sm font-semibold text-cream truncate">Install Shortcuts</h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Download{' '}
                <a href="https://apps.apple.com/app/shortcuts/id915249334" target="_blank" rel="noopener noreferrer" className="text-caramel hover:underline">Shortcuts</a>
                {' '}from the App Store. Pre-installed on iOS 13+.
              </p>
            </div>
          </div>

          {/* Step 02 — horizontal row */}
          <div className="flex items-center gap-4 bg-surface-card rounded-xl p-4 border border-border">
            <div className="shrink-0 w-11 h-11 rounded-[12px] flex items-center justify-center relative overflow-hidden shadow-lg shadow-caramel/15"
              style={{ background: 'linear-gradient(135deg, #d4aa80 0%, #c4956a 40%, #b07d52 100%)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-caramel/50 shrink-0">02</span>
                <h3 className="text-sm font-semibold text-cream truncate">Add Our Automation</h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">Tap to install our shortcut. It runs daily and syncs your screen time automatically.</p>
            </div>
          </div>

          {/* Step 03 — full block (has copy field) */}
          <div className="relative bg-surface-card rounded-xl p-4 border-2 border-caramel/40 shadow-lg shadow-caramel/10 mt-5">
            <div className="absolute -top-3 left-4 flex items-center gap-1.5 bg-caramel text-surface text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md shadow-caramel/30">
              <span className="w-1 h-1 rounded-full bg-surface animate-pulse" />
              Do this now
            </div>
            <div className="flex items-start gap-4 mb-4">
              <div className="shrink-0 w-11 h-11 rounded-[12px] flex items-center justify-center relative overflow-hidden shadow-lg shadow-[#A78BFA]/15"
                style={{ background: 'linear-gradient(135deg, #c4b5fd 0%, #A78BFA 40%, #7C5FD3 100%)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-caramel/50 shrink-0">03</span>
                  <h3 className="text-sm font-semibold text-cream">Enter Your Identity ID</h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">When the shortcut runs for the first time it will ask for your ID. Copy yours below and paste it in.</p>
              </div>
            </div>
            <CopyField value={identityId} />
          </div>
        </div>

        {/* 24 h notice */}
        <div className="flex items-center gap-3 bg-surface-card border border-caramel/20 rounded-xl px-4 py-3 md:rounded-2xl md:px-6 md:py-4 max-w-lg mx-auto">
          <span className="text-xl md:text-2xl shrink-0">⏳</span>
          <p className="text-xs md:text-sm text-muted leading-relaxed">
            <span className="text-cream font-semibold">Please allow at least 24 hours</span> after your first shortcut run for your data to appear here.
          </p>
        </div>

      </div>
    </div>
  );
}
