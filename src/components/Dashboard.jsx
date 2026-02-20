import { useState, useMemo, useCallback } from 'react';
import Chart from 'react-apexcharts';
import { parseScreenTimeData } from '../utils/parseData';
import ContributionsChart from './ContributionsChart';

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

  if (!parsed.length) return <p className="text-muted p-6">No data to display</p>;

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
