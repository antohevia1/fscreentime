import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import Chart from 'react-apexcharts';
import { parseScreenTimeData } from '../utils/parseData';
import ContributionsChart from './ContributionsChart';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { VIVID, DAY_NAMES, APP_BRAND_COLORS, contrastText, darkChart, fmt, ttFmt } from '../utils/dashboardUtils';

function Dashboard({ data }) {
  const parsed = useMemo(() => parseScreenTimeData(data), [data]);
  const appNames = useMemo(() => [...new Set(parsed.map(d => d.app))].sort(), [parsed]);

  // Stable color map: brand color if known, otherwise VIVID fallback
  const appColorMap = useMemo(() => {
    const totals = {};
    parsed.forEach(d => { totals[d.app] = (totals[d.app] || 0) + d.minutes; });
    const map = {};
    let vividIdx = 0;
    Object.entries(totals).sort((a, b) => b[1] - a[1]).forEach(([app]) => {
      const brand = APP_BRAND_COLORS[app.toLowerCase()];
      if (brand) {
        map[app] = brand;
      } else {
        map[app] = VIVID[vividIdx % VIVID.length];
        vividIdx++;
      }
    });
    return map;
  }, [parsed]);

  const [timeframe, setTimeframe] = useState('7d');
  const [selectedApp, setSelectedApp] = useState('all');

  // Legend click handler: set page level app filter
  const onLegendClick = useCallback((appName) => {
    setSelectedApp(prev => prev === appName ? 'all' : appName);
  }, []);


  // Time-filtered base: shared by dowChart, areaChart, and filtered
  const timeFiltered = useMemo(() => {
    if (timeframe === 'all') return parsed;
    const days = timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : timeframe === '30d' ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    return parsed.filter(d => d.date >= cutoff);
  }, [parsed, timeframe]);

  // For the DoW chart we use a custom legend so clicking filters data rather than toggling series visibility
  const dowChart = useMemo(() => {
    const allApps = [...new Set(timeFiltered.map(d => d.app))].slice(0, 10);
    const map = {};
    timeFiltered.forEach(d => {
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
        color: selectedApp === 'all' || selectedApp === app ? (appColorMap[app] || VIVID[i % VIVID.length]) : '#3e3830',
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
  }, [timeFiltered, selectedApp, appColorMap]);

  const filtered = useMemo(() => {
    if (selectedApp !== 'all') return timeFiltered.filter(d => d.app === selectedApp);
    return timeFiltered;
  }, [timeFiltered, selectedApp]);

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
    const dates = [...new Set(timeFiltered.map(d => d.date))].sort();
    const map = {};
    const appTotals = {};
    const dateTotals = {};
    timeFiltered.forEach(d => {
      map[`${d.date}|${d.app}`] = (map[`${d.date}|${d.app}`] || 0) + d.minutes;
      appTotals[d.app] = (appTotals[d.app] || 0) + d.minutes;
      dateTotals[d.date] = (dateTotals[d.date] || 0) + d.minutes;
    });
    const apps = Object.entries(appTotals).sort((a, b) => b[1] - a[1]).map(([app]) => app).slice(0, 10);
    const appColors = apps.map((app, i) => selectedApp === 'all' || selectedApp === app ? (appColorMap[app] || VIVID[i % VIVID.length]) : '#3e3830');
    const n = apps.length;
    return {
      apps,
      series: [
        ...apps.map((app) => ({
          name: app,
          data: dates.map(dt => +((map[`${dt}|${app}`] || 0) / 60).toFixed(2)),
        })),
        { name: 'Total', data: dates.map(dt => +((dateTotals[dt] || 0) / 60).toFixed(2)) },
      ],
      options: {
        ...darkChart,
        chart: { ...darkChart.chart, type: 'area', events: {} },
        colors: [...appColors, '#ffffff'],
        xaxis: { categories: dates, labels: { rotate: -45, rotateAlways: dates.length > 14 } },
        yaxis: { title: { text: 'Hours', style: { color: '#9a8e80' } }, labels: { formatter: v => { const h = Math.floor(v); const m = Math.round((v - h) * 60); return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`; } } },
        stroke: { curve: 'smooth', width: [...Array(n).fill(2), 3], dashArray: [...Array(n).fill(0), 5] },
        fill: { type: [...Array(n).fill('gradient'), 'solid'], gradient: { opacityFrom: 0.3, opacityTo: 0.02 }, opacity: [...Array(n).fill(1), 0.001] },
        tooltip: { y: { formatter: ttFmt } },
        legend: { show: false },
      },
    };
  }, [timeFiltered, selectedApp, appColorMap]);

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
        plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 2, distributed: true } },
        xaxis: { title: { text: 'Total Hours', style: { color: '#9a8e80' } } },
        labels: sorted.map(([k]) => k),
        colors: sorted.map(([k]) => appColorMap[k] || '#4ECDC4'),
        legend: { show: false },
        tooltip: { y: { formatter: ttFmt } },
      },
    };
  }, [filtered, onLegendClick, appColorMap]);

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
        colors: Object.entries(map).sort((a, b) => b[1] - a[1]).map(([app]) => appColorMap[app] || VIVID[0]),
        plotOptions: { treemap: { distributed: true, enableShades: false } },
        dataLabels: {
          enabled: true,
          style: { fontSize: '14px', fontWeight: 600, colors: Object.entries(map).sort((a, b) => b[1] - a[1]).map(([app]) => contrastText(appColorMap[app] || VIVID[0])) },
          formatter: (text) => `${text}`,
          dropShadow: { enabled: false },
        },
        tooltip: { y: { formatter: v => fmt(v) } },
      },
    };
  }, [filtered, onLegendClick, appColorMap]);

  const appFiltered = useMemo(() => {
    if (selectedApp === 'all') return parsed;
    return parsed.filter(d => d.app === selectedApp);
  }, [parsed, selectedApp]);

  const { user } = useAuth();
  const [activeGoal, setActiveGoal] = useState(undefined);

  useEffect(() => {
    if (!user?.token) return;
    api.get('/goals', {
      params: { status: 'active' },
      headers: { Authorization: `Bearer ${user.token}` },
    }).then(r => setActiveGoal(r.data || null))
      .catch(() => setActiveGoal(null));
  }, [user?.token]);

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
                  style={{ backgroundColor: selectedApp === 'all' || selectedApp === app ? (appColorMap[app] || VIVID[i % VIVID.length]) : '#3e3830' }} />
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
                  style={{ backgroundColor: selectedApp === 'all' || selectedApp === app ? (appColorMap[app] || VIVID[i % VIVID.length]) : '#3e3830' }} />
                {app}
              </button>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-cream">
              <span className="w-3.5 h-0 inline-block" style={{ borderTop: '2.5px dashed #ffffff' }} />
              Total
            </span>
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

      <ContributionsChart data={appFiltered} />

      {/* Goal History */}
      <GoalHistorySection goalHistory={data.goalHistory} hasActiveGoal={activeGoal != null} />
    </div>
  );
}

export default Dashboard;

function GoalHistorySection({ goalHistory, hasActiveGoal }) {
  const goals = goalHistory || [];
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  const statusColors = {
    passed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    charged: 'text-red-400 bg-red-500/10 border-red-500/30',
    cancelled: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    charge_abandoned: 'text-muted bg-surface-hover border-border',
    failed_no_payment: 'text-muted bg-surface-hover border-border',
  };

  if (!hasActiveGoal) {
    return (
      <div className="bg-surface-card border border-border rounded-xl p-6 relative overflow-hidden">
        <h3 className="text-sm font-medium text-cream mb-4">Goal History</h3>
        {goals.length > 0 ? (
          <div className="relative">
            <div className="blur-sm pointer-events-none select-none">
              <GoalHistoryTable goals={goals.slice(0, 3)} fmtDate={fmtDate} statusColors={statusColors} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-surface-card/95 border border-caramel/30 rounded-xl px-6 py-5 text-center max-w-xs shadow-lg">
                <p className="text-cream font-semibold mb-1.5">Unlock your goal history</p>
                <p className="text-muted text-xs mb-4">Set a weekly screen time goal to track your progress over time.</p>
                <NavLink to="/app/goals" className="inline-flex px-4 py-2 rounded-lg bg-caramel text-surface text-sm font-semibold hover:bg-caramel-light transition">
                  Set a Goal
                </NavLink>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted text-sm mb-3">No goal history yet. Set a weekly goal to start building your streak.</p>
            <NavLink to="/app/goals" className="inline-flex px-4 py-2 rounded-lg bg-caramel text-surface text-sm font-semibold hover:bg-caramel-light transition">
              Set a Goal
            </NavLink>
          </div>
        )}
      </div>
    );
  }

  if (!goals.length) {
    return (
      <div className="bg-surface-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-cream mb-2">Goal History</h3>
        <p className="text-muted text-sm">Your first week is in progress. History will appear here after it ends.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-cream mb-3">Goal History</h3>
      <GoalHistoryTable goals={goals} fmtDate={fmtDate} statusColors={statusColors} />
    </div>
  );
}

function GoalHistoryTable({ goals, fmtDate, statusColors }) {
  const sorted = [...goals].sort((a, b) => (b.weekStart || '').localeCompare(a.weekStart || ''));
  return (
    <div className="space-y-2">
      {sorted.map((g, i) => (
        <div key={i} className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-cream text-sm font-medium">
              {fmtDate(g.weekStart)} – {fmtDate(g.weekEnd)}
            </p>
            <p className="text-muted text-xs mt-0.5">
              {g.screenTimeHours != null ? `${g.screenTimeHours}h` : '—'} / {g.goalHours}h limit
              {g.dailyLimit ? ` · ${g.dailyLimit}h/day` : ''}
              {g.charity ? ` · ${g.charity}` : ''}
            </p>
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusColors[g.status] || 'text-muted bg-surface-hover border-border'}`}>
            {g.status === 'passed' ? 'Passed' : g.status === 'charged' ? 'Charged $10' : g.status === 'cancelled' ? 'Cancelled' : g.status?.replace(/_/g, ' ') || 'unknown'}
          </span>
        </div>
      ))}
    </div>
  );
}

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

function ScreenshotCarousel({ items, className = '' }) {
  return (
    <div
      className={`flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 ${className}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {items.map((item, i) => (
        <div key={i} className="snap-start shrink-0 w-[55%] md:w-[40%]">
          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-lg shadow-black/20">
            <img src={item.src} alt={item.caption} className="w-full h-auto" />
          </div>
          <p className="text-[11px] text-muted mt-2 text-center leading-relaxed px-1">{item.caption}</p>
        </div>
      ))}
    </div>
  );
}

function DashboardEmpty({ userName, identityId }) {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState([false, false, false]);

  const markDone = (idx) => {
    setCompleted(prev => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
    if (idx < 2) setActiveStep(idx + 1);
  };

  const canAccess = (idx) => idx === 0 || completed[idx - 1];
  const allDone = completed.every(Boolean);

  const steps = [
    {
      title: 'Download Shortcuts App',
      summary: 'Get Apple Shortcuts on your iPhone.',
      icon: (
        <div className="w-11 h-11 md:w-14 md:h-14 rounded-[14px] md:rounded-[18px] shadow-xl shadow-[#EF3E56]/20 overflow-hidden shrink-0">
          <img src="/shortcuss.webp" alt="Shortcuts app" className="w-full h-full object-cover" />
        </div>
      ),
      content: (
        <>
          <p className="text-sm text-muted leading-relaxed mb-5">
            Apple Shortcuts lets you build powerful automations on your iPhone.
            It comes pre-installed on iOS&nbsp;13+. If you removed it, re-download it from the App&nbsp;Store.
          </p>
          <a
            href="https://apps.apple.com/app/shortcuts/id915249334"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-caramel/10 border border-caramel/30 text-caramel text-sm font-semibold hover:bg-caramel/20 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open in App Store
          </a>
        </>
      ),
      buttonText: 'I have Shortcuts installed',
    },
    {
      title: 'Get Our Shortcut',
      summary: 'Download our shortcut and paste your Identity ID.',
      icon: (
        <div
          className="w-11 h-11 md:w-14 md:h-14 rounded-[14px] md:rounded-[18px] shadow-xl shadow-caramel/20 flex items-center justify-center relative overflow-hidden shrink-0"
          style={{ background: 'linear-gradient(135deg, #d4aa80 0%, #c4956a 40%, #b07d52 100%)' }}
        >
          <svg width="22" height="22" className="md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        </div>
      ),
      content: (
        <>
          <p className="text-sm text-muted leading-relaxed mb-4">
            Tap the link below to import the shortcut, then paste your Identity&nbsp;ID when prompted.
          </p>
          <ol className="text-sm text-muted space-y-2 mb-5 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-caramel font-semibold shrink-0">1.</span>
              <span>Tap <span className="text-cream">Get Our Shortcut</span> below and hit <span className="text-cream">Set Up Shortcut</span>.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-caramel font-semibold shrink-0">2.</span>
              <span>Paste your <span className="text-cream">Identity ID</span> into the deviceKey field (copy it below).</span>
            </li>
            <li className="flex gap-3">
              <span className="text-caramel font-semibold shrink-0">3.</span>
              <span>Run the shortcut once by tapping it. When asked for permissions, tap <span className="text-cream font-semibold">Always Allow</span>.</span>
            </li>
          </ol>
          <CopyField value={identityId} />
          <ScreenshotCarousel
            className="mt-5"
            items={[
              { src: '/step2.1.PNG', caption: 'Tap "Set Up Shortcut" to import' },
              { src: '/step2.2.PNG', caption: 'Paste your Identity ID here' },
              { src: '/step2.3.PNG', caption: 'Tap "Always Allow"' },
            ]}
          />
          <a
            href={import.meta.env.VITE_SHORTCUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-caramel/10 border border-caramel/30 text-caramel text-sm font-semibold hover:bg-caramel/20 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Get Our Shortcut
          </a>
        </>
      ),
      buttonText: "I've added the shortcut",
    },
    {
      title: 'Create Daily Automation',
      summary: 'Set the shortcut to run at 9 AM every day.',
      icon: (
        <div
          className="w-11 h-11 md:w-14 md:h-14 rounded-[14px] md:rounded-[18px] shadow-xl shadow-[#A78BFA]/20 flex items-center justify-center relative overflow-hidden shrink-0"
          style={{ background: 'linear-gradient(135deg, #c4b5fd 0%, #A78BFA 40%, #7C5FD3 100%)' }}
        >
          <svg width="22" height="22" className="md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        </div>
      ),
      content: (
        <>
          <p className="text-sm text-muted leading-relaxed mb-4">
            Create an automation in Shortcuts so your screen time data syncs every morning.
          </p>
          <ol className="text-sm text-muted space-y-2 mb-5 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-caramel font-semibold shrink-0">1.</span>
              <span>Open <span className="text-cream">Shortcuts</span>, tap the <span className="text-cream">Automation</span> tab, then tap <span className="text-cream">+</span>.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-caramel font-semibold shrink-0">2.</span>
              <span>Select <span className="text-cream">Time of Day</span> as your trigger.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-caramel font-semibold shrink-0">3.</span>
              <span>Set <span className="text-cream font-semibold">9:00&nbsp;AM</span>, repeat <span className="text-cream">Daily</span>, and select <span className="text-cream font-semibold">Run Immediately</span>. Tap <span className="text-cream">Next</span>.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-caramel font-semibold shrink-0">4.</span>
              <span>Under My Shortcuts, select <span className="text-cream font-semibold">Daily ingest</span> &mdash; the shortcut you just imported.</span>
            </li>
          </ol>
          <ScreenshotCarousel
            items={[
              { src: '/Step3.1.PNG', caption: 'Tap + in the Automation tab' },
              { src: '/Step3.2.PNG', caption: 'Select "Time of Day"' },
              { src: '/Step3.3.PNG', caption: '9 AM, Daily, Run Immediately' },
              { src: '/Step3.4.PNG', caption: 'Select "Daily ingest" shortcut' },
            ]}
          />
        </>
      ),
      buttonText: 'All set!',
    },
  ];

  return (
    <div className="relative flex flex-col items-center px-4 py-8 md:py-16 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-glow text-caramel absolute" style={{ top: '20%', left: '30%', opacity: 0.09 }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-7 md:mb-10">
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

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8 md:mb-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center">
              {i > 0 && (
                <div
                  className={`h-0.5 w-10 md:w-16 transition-colors duration-500 ${
                    completed[i - 1] ? 'bg-caramel' : 'bg-border'
                  }`}
                />
              )}
              <button
                onClick={() => canAccess(i) && setActiveStep(i)}
                disabled={!canAccess(i)}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  completed[i]
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 cursor-pointer'
                    : activeStep === i
                    ? 'bg-caramel text-surface shadow-lg shadow-caramel/30 scale-110'
                    : canAccess(i)
                    ? 'bg-surface-card text-muted border border-border hover:border-caramel/30 cursor-pointer'
                    : 'bg-surface-card text-muted/40 border border-border/50 cursor-not-allowed'
                }`}
              >
                {completed[i] ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Step cards */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isActive = activeStep === i;
            const isDone = completed[i];
            const accessible = canAccess(i);

            return (
              <div
                key={i}
                className={`rounded-2xl border transition-all duration-300 ${
                  isActive
                    ? 'border-caramel/40 bg-surface-card shadow-lg shadow-caramel/5'
                    : isDone
                    ? 'border-emerald-500/20 bg-surface-card/50'
                    : accessible
                    ? 'border-border bg-surface-card/50 hover:border-caramel/20'
                    : 'border-border/50 bg-surface-card/30 opacity-50'
                }`}
              >
                {/* Step header — always visible */}
                <button
                  onClick={() => accessible && setActiveStep(i)}
                  disabled={!accessible}
                  className={`w-full flex items-center gap-4 p-4 md:p-5 text-left ${
                    accessible ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                >
                  <div className={`transition-all duration-300 ${isActive ? 'scale-100' : 'scale-90 opacity-70'}`}>
                    {step.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[10px] font-mono transition-colors duration-300 ${
                          isDone ? 'text-emerald-400/60' : isActive ? 'text-caramel' : 'text-caramel/40'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3
                        className={`text-sm md:text-base font-semibold transition-colors duration-300 ${
                          isDone && !isActive ? 'text-cream/50' : 'text-cream'
                        }`}
                      >
                        {step.title}
                      </h3>
                    </div>
                    {!isActive && (
                      <p className="text-xs text-muted truncate">{step.summary}</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    {isDone ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : isActive ? (
                      <div className="w-7 h-7 rounded-full bg-caramel/20 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-caramel animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-muted/30" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Expandable content area */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: isActive ? '1fr' : '0fr',
                    transition: 'grid-template-rows 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-5 md:px-6 md:pb-6">
                      {step.content}

                      <button
                        onClick={(e) => { e.stopPropagation(); markDone(i); }}
                        className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-caramel to-caramel-light text-surface text-sm font-bold shadow-lg shadow-caramel/25 hover:shadow-caramel/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                      >
                        {step.buttonText}
                        {i < 2 ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 24 h notice / success */}
        <div
          className={`mt-8 flex items-center gap-3 bg-surface-card border rounded-xl px-4 py-3 md:rounded-2xl md:px-6 md:py-4 max-w-lg mx-auto transition-all duration-500 ${
            allDone ? 'border-emerald-500/30' : 'border-caramel/20'
          }`}
        >
          <span className="text-xl md:text-2xl shrink-0">{allDone ? '\uD83C\uDF89' : '\u23F3'}</span>
          <p className="text-xs md:text-sm text-muted leading-relaxed">
            {allDone ? (
              <>
                <span className="text-emerald-400 font-semibold">You're all set!</span>{' '}
                Your screen time data will appear here within 24 hours after the shortcut runs for the first time.
              </>
            ) : (
              <>
                <span className="text-cream font-semibold">Please allow at least 24 hours</span>{' '}
                after your first shortcut run for your data to appear here.
              </>
            )}
          </p>
        </div>

      </div>
    </div>
  );
}
