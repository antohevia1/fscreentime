import { useMemo, useState } from 'react';

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getColor(value, max) {
  if (!value) return '#3e3830';
  const ratio = value / (max || 1);
  const r = Math.round(76 + ratio * (220 - 76));
  const g = Math.round(175 - ratio * (175 - 53));
  const b = Math.round(80 - ratio * (80 - 46));
  return `rgb(${r},${g},${b})`;
}

function ContributionsChart({ data }) {
  const availableYears = useMemo(() => {
    const years = new Set(data.map(d => new Date(d.date).getFullYear()));
    if (!years.size) years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [data]);

  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [tooltip, setTooltip] = useState(null);

  const { weeks, max, monthLabels } = useMemo(() => {
    const map = {};
    data.forEach(d => { map[d.date] = (map[d.date] || 0) + d.minutes; });

    const year = selectedYear;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    const alignedStart = new Date(start);
    alignedStart.setDate(alignedStart.getDate() - alignedStart.getDay());

    const weeks = [];
    const monthLabels = [];
    let current = new Date(alignedStart);
    let lastMonth = -1;

    while (current <= end) {
      const dow = current.getDay();
      if (dow === 0) weeks.push([]);
      const dateStr = current.toISOString().split('T')[0];
      const inRange = current >= start && current <= end;
      weeks[weeks.length - 1].push({ date: dateStr, value: map[dateStr] || 0, inRange });

      const month = current.getMonth();
      if (month !== lastMonth && dow === 0 && current >= start) {
        monthLabels.push({ index: weeks.length - 1, label: current.toLocaleString('default', { month: 'short' }) });
        lastMonth = month;
      }
      current.setDate(current.getDate() + 1);
    }
    while (weeks[weeks.length - 1]?.length < 7) {
      weeks[weeks.length - 1].push({ date: '', value: 0, inRange: false });
    }

    const vals = Object.values(map).filter(v => v > 0);
    return { weeks, max: vals.length ? Math.max(...vals) : 0, monthLabels };
  }, [data, selectedYear]);

  if (!weeks.length) return null;

  return (
    <div className="bg-surface-card border border-border rounded-xl p-5 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-cream">Daily Activity</h3>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="text-xs border border-border rounded-lg px-2 py-1 bg-surface-card text-cream focus:outline-none focus:border-caramel/60"
        >
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-[3px]" style={{ minWidth: 'max-content' }}>
          <div className="flex flex-col gap-[3px] pt-5 pr-1 shrink-0">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="text-[10px] text-muted h-[13px] leading-[13px] text-right">{d}</span>
            ))}
          </div>
          <div>
            <div className="flex gap-[3px] h-5 mb-[2px]">
              {weeks.map((_, wi) => {
                const ml = monthLabels.find(m => m.index === wi);
                return <span key={wi} className="w-[13px] shrink-0 text-[10px] text-muted">{ml?.label || ''}</span>;
              })}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className="w-[13px] h-[13px] rounded-sm cursor-default"
                      style={{ backgroundColor: day.inRange ? getColor(day.value, max) : 'transparent' }}
                      onMouseEnter={e => {
                        if (!day.inRange) return;
                        const rect = e.target.getBoundingClientRect();
                        setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, text: `${day.date} · ${(day.value / 60).toFixed(1)}h` });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      role="img"
                      aria-label={day.inRange ? `${day.date}: ${(day.value / 60).toFixed(1)} hours` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 justify-end text-[11px] text-muted">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <div key={i} className="w-[13px] h-[13px] rounded-sm" style={{ backgroundColor: r === 0 ? '#3e3830' : getColor(r * max, max) }} />
        ))}
        <span>More</span>
      </div>
      {tooltip && (
        <div className="fixed z-50 px-2 py-1 text-xs bg-surface-light text-cream rounded shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full border border-border"
          style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default ContributionsChart;
