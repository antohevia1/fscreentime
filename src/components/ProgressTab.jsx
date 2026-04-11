import { useMemo, useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { fmt } from '../utils/dashboardUtils';

// ═══════════════════════════════════════════════════════════════
// THE SUNKEN KINGDOM — Underwater restoration scene
// Water clarity, bioluminescent life, and coral return as you
// reduce screen time. Screen time = pollution / silt.
// ═══════════════════════════════════════════════════════════════

// ── Silt / pollution particles (fade out at higher levels) ──
function SiltParticles({ count, opacity }) {
  if (count <= 0) return null;
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x: 15 + ((i * 137.5) % 370),
      y: 20 + ((i * 97.3) % 180),
      r: 1.2 + (i % 3) * 0.6,
      dur: 3 + (i % 4) * 1.5,
      delay: (i % 5) * 0.8,
    })),
  [count]);

  return (
    <g opacity={opacity}>
      {particles.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#8B7355">
          <animate attributeName="cy" values={`${p.y};${p.y - 20};${p.y}`} dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

// ── Bubbles (appear at higher levels — life returning) ──
function Bubbles({ count }) {
  if (count <= 0) return null;
  const bubbles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x: 40 + ((i * 83.7) % 320),
      startY: 210,
      r: 1.5 + (i % 3),
      dur: 4 + (i % 3) * 2,
      delay: i * 1.2,
    })),
  [count]);

  return (
    <g>
      {bubbles.map((b, i) => (
        <circle key={i} cx={b.x} r={b.r} fill="none" stroke="rgba(147,220,255,0.4)" strokeWidth="0.5">
          <animate attributeName="cy" values={`${b.startY};20`} dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.3;0" dur={`${b.dur}s`} begin={`${b.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

// ── Seabed / ocean floor ──
function Seabed({ level }) {
  // Transitions from grey dead rock to warm sandy colors
  const sandColor = level >= 6 ? '#5C4A32' : level >= 3 ? '#4A4038' : '#3A3838';
  const rockColor = level >= 6 ? '#6B5B45' : level >= 3 ? '#504840' : '#454040';

  return (
    <g>
      {/* Main seabed */}
      <path d={`M0 200 Q50 188 100 192 Q150 186 200 190 Q250 184 300 188 Q350 186 400 192 L400 230 L0 230 Z`}
        fill={sandColor} />
      {/* Rocky outcrops */}
      <ellipse cx="60" cy="195" rx="25" ry="8" fill={rockColor} />
      <ellipse cx="200" cy="192" rx="30" ry="10" fill={rockColor} />
      <ellipse cx="340" cy="194" rx="22" ry="7" fill={rockColor} />
      {/* Small pebbles */}
      <circle cx="120" cy="196" r="3" fill={rockColor} opacity="0.6" />
      <circle cx="280" cy="194" r="2.5" fill={rockColor} opacity="0.5" />
      <circle cx="170" cy="198" r="2" fill={rockColor} opacity="0.4" />
    </g>
  );
}

// ── Ruins / Atlantis columns ──
function Ruins({ level }) {
  // Opacity of ruin details increases with level (emerging from murk)
  const stoneColor = level >= 7 ? '#8B9DAF' : level >= 4 ? '#6B7580' : '#505558';
  const detailOpacity = Math.min(0.3 + level * 0.07, 1);
  const glowOpacity = level >= 5 ? Math.min((level - 4) * 0.12, 0.5) : 0;

  return (
    <g opacity={detailOpacity}>
      {/* Left broken column */}
      <rect x="45" y="140" width="12" height="52" rx="2" fill={stoneColor} />
      <rect x="42" y="136" width="18" height="6" rx="1" fill={stoneColor} />
      {/* Column grooves */}
      <line x1="48" y1="142" x2="48" y2="190" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
      <line x1="54" y1="142" x2="54" y2="190" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />

      {/* Center archway */}
      <rect x="180" y="130" width="10" height="62" rx="1" fill={stoneColor} />
      <rect x="220" y="135" width="10" height="57" rx="1" fill={stoneColor} />
      <path d="M180 130 Q205 110 230 135" fill="none" stroke={stoneColor} strokeWidth="8" strokeLinecap="round" />
      {/* Arch detail */}
      <path d="M185 132 Q205 118 225 137" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />

      {/* Right tilted column */}
      <g transform="translate(330, 148) rotate(-8)">
        <rect x="-5" y="-45" width="10" height="45" rx="2" fill={stoneColor} />
        <rect x="-8" y="-50" width="16" height="6" rx="1" fill={stoneColor} />
      </g>

      {/* Ruin glow at high levels (bioluminescent moss on ruins) */}
      {glowOpacity > 0 && (
        <g>
          <ellipse cx="51" cy="160" rx="8" ry="3" fill="#00FFD4" opacity={glowOpacity * 0.4}>
            <animate attributeName="opacity" values={`${glowOpacity * 0.3};${glowOpacity * 0.5};${glowOpacity * 0.3}`} dur="4s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="195" cy="155" rx="6" ry="2.5" fill="#00FFD4" opacity={glowOpacity * 0.3}>
            <animate attributeName="opacity" values={`${glowOpacity * 0.2};${glowOpacity * 0.4};${glowOpacity * 0.2}`} dur="5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="328" cy="152" rx="5" ry="2" fill="#7DF9FF" opacity={glowOpacity * 0.35}>
            <animate attributeName="opacity" values={`${glowOpacity * 0.2};${glowOpacity * 0.45};${glowOpacity * 0.2}`} dur="3.5s" repeatCount="indefinite" />
          </ellipse>
        </g>
      )}
    </g>
  );
}

// ── Dead coral (grey) → Living coral (colorful) ──
function Coral({ x, y, level, delay = 0, variant = 0 }) {
  // Color transitions from grey/dead to vibrant
  const deadColor = '#505050';
  const aliveColors = ['#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6'];
  const color = level >= 4 ? aliveColors[variant % aliveColors.length] : level >= 2 ? '#7A6B5A' : deadColor;
  const glowColor = level >= 6 ? aliveColors[variant % aliveColors.length] : 'transparent';

  const shapes = [
    // Branching coral
    () => (
      <g style={{ animation: `fadeReveal 1s ease-out ${delay}s both` }}>
        <path d={`M0 0 Q-4 -12 -8 -20 M0 0 Q2 -14 6 -22 M0 0 Q-1 -10 -5 -14 Q-8 -18 -12 -16`}
          fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {level >= 6 && <circle cx="0" cy="-18" r="6" fill={glowColor} opacity="0.15">
          <animate attributeName="opacity" values="0.1;0.2;0.1" dur="3s" repeatCount="indefinite" />
        </circle>}
      </g>
    ),
    // Fan coral
    () => (
      <g style={{ animation: `fadeReveal 1s ease-out ${delay}s both` }}>
        <ellipse cx="0" cy="-14" rx="10" ry="14" fill={color} opacity="0.35" />
        <path d={`M0 0 Q-6 -10 -8 -18 M0 0 Q0 -12 0 -22 M0 0 Q6 -10 8 -18`}
          fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {level >= 7 && <ellipse cx="0" cy="-14" rx="12" ry="16" fill={glowColor} opacity="0.1">
          <animate attributeName="opacity" values="0.05;0.15;0.05" dur="4s" repeatCount="indefinite" />
        </ellipse>}
      </g>
    ),
    // Round/brain coral
    () => (
      <g style={{ animation: `fadeReveal 1s ease-out ${delay}s both` }}>
        <ellipse cx="0" cy="-8" rx="10" ry="8" fill={color} opacity="0.5" />
        <ellipse cx="0" cy="-9" rx="7" ry="5.5" fill={color} opacity="0.7" />
        {level >= 6 && <ellipse cx="0" cy="-8" r="12" fill={glowColor} opacity="0.08">
          <animate attributeName="opacity" values="0.05;0.12;0.05" dur="3.5s" repeatCount="indefinite" />
        </ellipse>}
      </g>
    ),
  ];

  return <g transform={`translate(${x}, ${y})`}>{shapes[variant % shapes.length]()}</g>;
}

// ── Seaweed / kelp ──
function Seaweed({ x, y, height = 35, level, delay = 0 }) {
  const deadColor = '#3A4A3A';
  const aliveColor = level >= 5 ? '#2ECC71' : level >= 3 ? '#5A7A5A' : deadColor;
  const glowOpacity = level >= 7 ? 0.2 : 0;

  return (
    <g transform={`translate(${x}, ${y})`} style={{ animation: `fadeReveal 0.8s ease-out ${delay}s both` }}>
      <path d={`M0 0 Q-5 ${-height * 0.3} -2 ${-height * 0.6} Q1 ${-height * 0.8} -3 ${-height}`}
        fill="none" stroke={aliveColor} strokeWidth="2.5" strokeLinecap="round">
        <animate attributeName="d"
          values={`M0 0 Q-5 ${-height * 0.3} -2 ${-height * 0.6} Q1 ${-height * 0.8} -3 ${-height};M0 0 Q-3 ${-height * 0.3} -4 ${-height * 0.6} Q-1 ${-height * 0.8} -1 ${-height};M0 0 Q-5 ${-height * 0.3} -2 ${-height * 0.6} Q1 ${-height * 0.8} -3 ${-height}`}
          dur="5s" repeatCount="indefinite" />
      </path>
      <path d={`M2 -4 Q7 ${-height * 0.35} 4 ${-height * 0.65} Q1 ${-height * 0.85} 5 ${-height * 0.95}`}
        fill="none" stroke={aliveColor} strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <animate attributeName="d"
          values={`M2 -4 Q7 ${-height * 0.35} 4 ${-height * 0.65} Q1 ${-height * 0.85} 5 ${-height * 0.95};M2 -4 Q5 ${-height * 0.35} 6 ${-height * 0.65} Q3 ${-height * 0.85} 3 ${-height * 0.95};M2 -4 Q7 ${-height * 0.35} 4 ${-height * 0.65} Q1 ${-height * 0.85} 5 ${-height * 0.95}`}
          dur="4.5s" repeatCount="indefinite" />
      </path>
      {glowOpacity > 0 && (
        <ellipse cx="0" cy={-height * 0.5} rx="6" ry={height * 0.4} fill="#2ECC71" opacity={glowOpacity}>
          <animate attributeName="opacity" values={`${glowOpacity * 0.5};${glowOpacity};${glowOpacity * 0.5}`} dur="4s" repeatCount="indefinite" />
        </ellipse>
      )}
    </g>
  );
}

// ── Fish (return at higher levels) ──
function Fish({ x, y, color, size = 1, speed = 8, delay = 0, direction = 1 }) {
  const s = 6 * size;
  const startX = direction > 0 ? -30 : 430;
  const endX = direction > 0 ? 430 : -30;

  return (
    <g style={{ animation: `fadeReveal 0.5s ease-out ${delay}s both` }}>
      <g>
        <animate attributeName="opacity" values="0;1;1;0" dur={`${speed}s`} begin={`${delay}s`} repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate"
          values={`${startX} ${y};${endX} ${y}`}
          dur={`${speed}s`} begin={`${delay}s`} repeatCount="indefinite" />
        <g transform={`scale(${direction * size}, ${size})`}>
          {/* Body */}
          <ellipse cx="0" cy="0" rx={s} ry={s * 0.5} fill={color} opacity="0.85" />
          {/* Tail */}
          <path d={`M${-s} 0 L${-s * 1.6} ${-s * 0.5} L${-s * 1.6} ${s * 0.5} Z`} fill={color} opacity="0.7" />
          {/* Eye */}
          <circle cx={s * 0.4} cy={-s * 0.1} r={s * 0.15} fill="white" />
          <circle cx={s * 0.45} cy={-s * 0.1} r={s * 0.08} fill="#1a1a2e" />
          {/* Fin */}
          <path d={`M0 ${s * 0.3} Q${s * 0.2} ${s * 0.8} ${-s * 0.3} ${s * 0.5}`}
            fill={color} opacity="0.5" />
        </g>
      </g>
    </g>
  );
}

// ── Jellyfish (high levels — bioluminescent) ──
function Jellyfish({ x, y, color, size = 1, delay = 0 }) {
  const s = 10 * size;
  return (
    <g transform={`translate(${x}, ${y})`} style={{ animation: `fadeReveal 1s ease-out ${delay}s both` }}>
      <g>
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="5s" begin={`${delay}s`} repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate"
          values={`0 0;0 -8;0 0`}
          dur="6s" begin={`${delay}s`} repeatCount="indefinite" />
        {/* Bell */}
        <path d={`M${-s} 0 Q${-s} ${-s * 1.4} 0 ${-s * 1.5} Q${s} ${-s * 1.4} ${s} 0 Q${s * 0.5} ${s * 0.3} 0 ${s * 0.2} Q${-s * 0.5} ${s * 0.3} ${-s} 0`}
          fill={color} opacity="0.3" />
        <path d={`M${-s * 0.7} 0 Q${-s * 0.7} ${-s * 1.1} 0 ${-s * 1.2} Q${s * 0.7} ${-s * 1.1} ${s * 0.7} 0`}
          fill={color} opacity="0.15" />
        {/* Tentacles */}
        {[-0.5, 0, 0.5].map((offset, i) => (
          <path key={i} d={`M${s * offset} ${s * 0.2} Q${s * (offset - 0.2)} ${s * 0.8} ${s * (offset + 0.1)} ${s * 1.3}`}
            fill="none" stroke={color} strokeWidth="1" opacity="0.4" strokeLinecap="round">
            <animate attributeName="d"
              values={`M${s * offset} ${s * 0.2} Q${s * (offset - 0.2)} ${s * 0.8} ${s * (offset + 0.1)} ${s * 1.3};M${s * offset} ${s * 0.2} Q${s * (offset + 0.2)} ${s * 0.9} ${s * (offset - 0.1)} ${s * 1.4};M${s * offset} ${s * 0.2} Q${s * (offset - 0.2)} ${s * 0.8} ${s * (offset + 0.1)} ${s * 1.3}`}
              dur={`${3 + i}s`} repeatCount="indefinite" />
          </path>
        ))}
        {/* Glow */}
        <ellipse cx="0" cy={-s * 0.5} rx={s * 1.2} ry={s * 1.2} fill={color} opacity="0.08">
          <animate attributeName="opacity" values="0.05;0.12;0.05" dur="4s" repeatCount="indefinite" />
        </ellipse>
      </g>
    </g>
  );
}

// ── Light rays from surface (clear water) ──
function LightRays({ opacity }) {
  if (opacity <= 0) return null;
  return (
    <g opacity={opacity}>
      {[60, 150, 260, 350].map((x, i) => (
        <polygon key={i}
          points={`${x} 0, ${x - 15} 0, ${x + 10} 220, ${x + 35} 220`}
          fill="url(#lightRayGrad)"
          opacity={0.08 + i * 0.02}>
          <animate attributeName="opacity" values={`${0.05 + i * 0.02};${0.12 + i * 0.02};${0.05 + i * 0.02}`}
            dur={`${6 + i}s`} repeatCount="indefinite" />
        </polygon>
      ))}
    </g>
  );
}


// ═══════════════════════════════════════════════════════════════
// MAIN SCENE
// ═══════════════════════════════════════════════════════════════
function SunkenKingdom({ streak, reclaimedMinutes, totalGoals, onShowLevels }) {
  const level = useMemo(() => {
    const streakScore = Math.min(streak * 2, 10);
    const reclaimedScore = Math.min(reclaimedMinutes / 500, 10);
    return Math.min(Math.round((streakScore + reclaimedScore) / 2), 10);
  }, [streak, reclaimedMinutes]);

  // Water color transitions from murky brown → dark teal → clear deep blue
  const waterColors = useMemo(() => {
    if (level <= 1) return { top: '#1a1510', mid: '#2a2218', bottom: '#1e1a14' };      // murky brown
    if (level <= 3) return { top: '#141e22', mid: '#1a2a2e', bottom: '#162025' };       // clearing murk
    if (level <= 5) return { top: '#0a1628', mid: '#0e2035', bottom: '#0c1a2e' };       // dark ocean
    if (level <= 7) return { top: '#081530', mid: '#0a1e3d', bottom: '#091828' };       // deep blue
    return { top: '#061235', mid: '#0a1e45', bottom: '#071530' };                        // crystal deep
  }, [level]);

  // Silt decreases, bubbles + fish increase
  const siltCount = Math.max(0, 25 - level * 3);
  const siltOpacity = Math.max(0, 0.7 - level * 0.08);
  const bubbleCount = Math.min(level, 8);

  const levelLabels = [
    'Polluted depths',
    'Silt clearing',
    'Life stirs',
    'Coral awakening',
    'Reef recovering',
    'Waters clearing',
    'Bioluminescent dawn',
    'Kingdom emerging',
    'Reef thriving',
    'Vibrant sanctuary',
    'Restored kingdom',
  ];

  const w = 400;
  const h = 220;

  return (
    <div className="relative">
      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(180deg, ${waterColors.top} 0%, ${waterColors.mid} 50%, ${waterColors.bottom} 100%)`
      }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMax meet"
          style={{ minHeight: 200 }}>
          <defs>
            <linearGradient id="lightRayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93DCFF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#93DCFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Light rays from surface (only when water is clear enough) */}
          <LightRays opacity={level >= 4 ? Math.min((level - 3) * 0.15, 0.8) : 0} />

          {/* Silt / pollution particles */}
          <SiltParticles count={siltCount} opacity={siltOpacity} />

          {/* Ruins — always present, visibility increases */}
          <Ruins level={level} />

          {/* Seabed */}
          <Seabed level={level} />

          {/* Seaweed — starts dead grey, becomes alive */}
          {level >= 1 && <Seaweed x={30} y={192} height={30} level={level} delay={0.2} />}
          {level >= 2 && <Seaweed x={90} y={190} height={25} level={level} delay={0.4} />}
          {level >= 3 && <Seaweed x={300} y={188} height={35} level={level} delay={0.3} />}
          {level >= 4 && <Seaweed x={370} y={192} height={28} level={level} delay={0.5} />}
          {level >= 6 && <Seaweed x={155} y={191} height={32} level={level} delay={0.6} />}
          {level >= 8 && <Seaweed x={250} y={189} height={38} level={level} delay={0.7} />}

          {/* Coral — dead grey → colorful */}
          {level >= 1 && <Coral x={75} y={192} level={level} delay={0.3} variant={0} />}
          {level >= 2 && <Coral x={270} y={189} level={level} delay={0.5} variant={1} />}
          {level >= 3 && <Coral x={140} y={193} level={level} delay={0.4} variant={2} />}
          {level >= 4 && <Coral x={350} y={191} level={level} delay={0.6} variant={0} />}
          {level >= 5 && <Coral x={200} y={190} level={level} delay={0.5} variant={1} />}
          {level >= 7 && <Coral x={110} y={191} level={level} delay={0.7} variant={2} />}
          {level >= 8 && <Coral x={310} y={190} level={level} delay={0.8} variant={0} />}
          {level >= 9 && <Coral x={240} y={188} level={level} delay={0.6} variant={1} />}

          {/* Bubbles */}
          <Bubbles count={bubbleCount} />

          {/* Fish return at mid-levels */}
          {level >= 4 && <Fish x={0} y={120} color="#4D96FF" size={0.8} speed={10} delay={1} direction={1} />}
          {level >= 5 && <Fish x={0} y={80} color="#FFD93D" size={0.6} speed={12} delay={3} direction={-1} />}
          {level >= 6 && <Fish x={0} y={150} color="#FF6B6B" size={0.9} speed={9} delay={2} direction={1} />}
          {level >= 7 && <Fish x={0} y={60} color="#6BCB77" size={0.7} speed={11} delay={4} direction={-1} />}
          {level >= 8 && <Fish x={0} y={100} color="#E86FFF" size={1} speed={8} delay={1.5} direction={1} />}
          {level >= 9 && <Fish x={0} y={140} color="#FF8E53" size={0.65} speed={13} delay={5} direction={-1} />}

          {/* Jellyfish at high levels */}
          {level >= 7 && <Jellyfish x={320} y={70} color="#7DF9FF" size={0.8} delay={1} />}
          {level >= 9 && <Jellyfish x={80} y={50} color="#E86FFF" size={0.6} delay={2.5} />}
          {level >= 10 && <Jellyfish x={200} y={40} color="#00FFD4" size={0.7} delay={3.5} />}

          {/* Empty-state message */}
          {level === 0 && (
            <text x={w / 2} y={h / 2 - 20} textAnchor="middle" fill="#7a6e60" fontSize="12" fontFamily="inherit">
              <tspan x={w / 2} dy="0">The kingdom lies dormant beneath the silt.</tspan>
              <tspan x={w / 2} dy="16">Reduce your screen time to restore it.</tspan>
            </text>
          )}
        </svg>

        {/* Level badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className={`text-[10px] uppercase tracking-wider font-medium backdrop-blur-sm px-2.5 py-1 rounded-full ${
            level >= 6 ? 'text-cyan-300/90 bg-cyan-900/40' : 'text-muted bg-black/30'
          }`}>
            {levelLabels[level]}
          </span>
        </div>
        <button
          onClick={() => onShowLevels(level)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] text-muted bg-black/30 hover:bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full transition cursor-pointer"
        >
          <span>Depth {level}/10</span>
          <svg className="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes fadeReveal {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}


// ── Levels info popover ──
const LEVEL_INFO = [
  { name: 'Polluted depths',     icon: '~',  desc: 'Heavy silt clouds the water. The ruins are barely visible.' },
  { name: 'Silt clearing',       icon: '~',  desc: 'The first particles begin to settle. Dead seaweed appears on the seafloor.' },
  { name: 'Life stirs',          icon: '~',  desc: 'More coral skeletons emerge. The murk shifts from brown to dark teal.' },
  { name: 'Coral awakening',     icon: '~',  desc: 'Grey coral starts showing flecks of color. Faint shapes on the seabed.' },
  { name: 'Reef recovering',     icon: '~',  desc: 'The first fish return. Coral blooms in reds and oranges. Light rays pierce through.' },
  { name: 'Waters clearing',     icon: '~',  desc: 'Vibrant coral everywhere. Multiple fish species. Bubbles rise from the reef.' },
  { name: 'Bioluminescent dawn', icon: '~',  desc: 'The ruins glow with cyan moss. Seaweed pulses with soft light. A jellyfish drifts in.' },
  { name: 'Kingdom emerging',    icon: '~',  desc: 'The archway and columns are fully revealed. Schools of colorful fish swim past.' },
  { name: 'Reef thriving',       icon: '~',  desc: 'Dense coral gardens. Multiple jellyfish. The deep blue water is crystal clear.' },
  { name: 'Vibrant sanctuary',   icon: '~',  desc: 'A living ecosystem hums with bioluminescence. The kingdom is nearly restored.' },
  { name: 'Restored kingdom',    icon: '~',  desc: 'The Sunken Kingdom glows in full glory. You have cleaned up these waters completely.' },
];

function LevelsPopover({ currentLevel, onClose }) {
  const popoverRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Scroll the active level into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={popoverRef} className="relative bg-surface-light border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-cream">Restoration Depths</h3>
              <p className="text-xs text-muted mt-0.5">Reduce screen time & hit goals to clear the waters</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-cream transition p-1 -mr-1" aria-label="Close">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="px-5 py-3 bg-cyan-500/5 border-b border-border">
          <p className="text-[11px] text-cyan-300/80 leading-relaxed">
            Your depth level is calculated from your <span className="text-cream font-medium">goal streak</span> and <span className="text-cream font-medium">time reclaimed</span> vs your first week. Every passed goal and every minute saved pushes the silt away and brings life back to the reef.
          </p>
        </div>

        {/* Levels list */}
        <div className="max-h-[50vh] overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
          {LEVEL_INFO.map((lvl, i) => {
            const isCurrent = i === currentLevel;
            const isReached = i <= currentLevel;
            const isLocked = i > currentLevel;

            return (
              <div
                key={i}
                ref={isCurrent ? activeRef : null}
                className={`flex items-start gap-3 px-5 py-2.5 transition ${
                  isCurrent ? 'bg-cyan-500/10' : ''
                }`}
              >
                {/* Level number */}
                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
                  isCurrent
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : isReached
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-surface border-border text-muted/50'
                }`}>
                  {i}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      isCurrent ? 'text-cyan-300' : isReached ? 'text-cream' : 'text-muted/60'
                    }`}>
                      {lvl.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                        You are here
                      </span>
                    )}
                    {isLocked && (
                      <svg className="w-3 h-3 text-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${isLocked ? 'text-muted/40' : 'text-muted'}`}>
                    {lvl.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-full bg-surface-hover rounded-full h-1.5 w-24">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                  style={{ width: `${(currentLevel / 10) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-muted">{currentLevel}/10</span>
            </div>
            {currentLevel < 10 && (
              <span className="text-[11px] text-muted">
                Next: <span className="text-cyan-400">{LEVEL_INFO[currentLevel + 1]?.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// SUPPORTING UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ── Streak timeline ──
function StreakTimeline({ goalHistory }) {
  const sorted = [...goalHistory].sort((a, b) => (a.weekStart || '').localeCompare(b.weekStart || ''));
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  if (!sorted.length) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {sorted.map((g, i) => {
        const passed = g.status === 'passed';
        return (
          <div key={i} className="flex flex-col items-center gap-1 shrink-0" title={`${fmtDate(g.weekStart)}: ${passed ? 'Passed' : 'Missed'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
              passed
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {passed ? '✓' : '✗'}
            </div>
            <span className="text-[9px] text-muted whitespace-nowrap">{fmtDate(g.weekStart)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Circular Progress Ring ──
function ProgressRing({ value, max, size = 120, strokeWidth = 10, color = '#10B981', label, sublabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#3e3830" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-cream">{Math.round(pct * 100)}%</span>
        </div>
      </div>
      {label && <p className="text-sm font-medium text-cream text-center">{label}</p>}
      {sublabel && <p className="text-[11px] text-muted text-center">{sublabel}</p>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

export default function ProgressTab({ goalHistory, rewards, hasActiveGoal }) {
  const { streak, reclaimedMinutes, totalSaved, totalGoals } = rewards;
  const [showLevels, setShowLevels] = useState(false);
  const [levelsCurrentLevel, setLevelsCurrentLevel] = useState(0);

  const passedGoals = goalHistory.filter(g => g.status === 'passed').length;
  const chargedGoals = goalHistory.filter(g => g.status === 'charged').length;

  const latestGoal = useMemo(() => {
    const sorted = [...goalHistory].sort((a, b) => (b.weekStart || '').localeCompare(a.weekStart || ''));
    return sorted[0] || null;
  }, [goalHistory]);

  const avgImprovement = useMemo(() => {
    if (goalHistory.length < 2) return null;
    const sorted = [...goalHistory].sort((a, b) => (a.weekStart || '').localeCompare(b.weekStart || ''));
    const first = sorted[0]?.screenTimeHours;
    const last = sorted[sorted.length - 1]?.screenTimeHours;
    if (first == null || last == null || first === 0) return null;
    return ((first - last) / first * 100).toFixed(0);
  }, [goalHistory]);

  if (!hasActiveGoal && goalHistory.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-surface-card border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12c0 5.5 4.5 10 10 10s10-4.5 10-10" />
              <path d="M12 2C6.5 2 2 6.5 2 12" />
              <path d="M8 16s1.5 2 4 2 4-2 4-2" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-cream mb-2">Awaken the Sunken Kingdom</h3>
          <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
            An ancient reef lies dormant beneath murky waters. Set a screen time goal and begin the restoration — every week you succeed, the waters clear and life returns.
          </p>
          <NavLink to="/app/goals" className="inline-flex px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-700 transition">
            Begin Restoration
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sunken Kingdom visualization */}
      <div className="bg-surface-card border border-border rounded-xl p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-cream">The Sunken Kingdom</h3>
          <span className="text-[11px] text-muted">Restore the reef by reducing screen time</span>
        </div>
        <SunkenKingdom streak={streak} reclaimedMinutes={reclaimedMinutes} totalGoals={totalGoals}
          onShowLevels={(lvl) => { setLevelsCurrentLevel(lvl); setShowLevels(true); }} />
      </div>

      {/* Levels info popover */}
      {showLevels && <LevelsPopover currentLevel={levelsCurrentLevel} onClose={() => setShowLevels(false)} />}

      {/* Stats row — 3 key metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-card border border-border rounded-xl p-4 text-center">
          <div className="inline-flex w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 items-center justify-center mb-2">
            <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-cream">{streak}</p>
          <p className="text-[11px] text-muted mt-0.5">Week streak</p>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-4 text-center">
          <div className="inline-flex w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 items-center justify-center mb-2">
            <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-cream">{fmt(reclaimedMinutes)}</p>
          <p className="text-[11px] text-muted mt-0.5">Time reclaimed</p>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-4 text-center">
          <div className="inline-flex w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 items-center justify-center mb-2">
            <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-cream">${totalSaved}</p>
          <p className="text-[11px] text-muted mt-0.5">Money saved</p>
        </div>
      </div>

      {/* Goal progress rings + savings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-cream mb-4">Restoration Progress</h3>
          <div className="flex items-center justify-around">
            <ProgressRing
              value={passedGoals}
              max={totalGoals || 1}
              color="#06B6D4"
              label="Goals Hit"
              sublabel={`${passedGoals} of ${totalGoals}`}
            />
            {latestGoal && latestGoal.screenTimeHours != null && (
              <ProgressRing
                value={Math.max(0, latestGoal.goalHours - latestGoal.screenTimeHours)}
                max={latestGoal.goalHours}
                color={latestGoal.status === 'passed' ? '#06B6D4' : '#EF4444'}
                size={100}
                label="Latest Week"
                sublabel={`${latestGoal.screenTimeHours}h / ${latestGoal.goalHours}h`}
              />
            )}
          </div>
          {avgImprovement && Number(avgImprovement) > 0 && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1">
                <svg className="w-3 h-3 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                </svg>
                <span className="text-xs text-cyan-400 font-medium">{avgImprovement}% clearer waters since you started</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-cream mb-4">Treasure Chest</h3>
          <div className="flex flex-col items-center mb-4">
            {/* Treasure chest SVG */}
            <div className="relative w-24 h-24 mb-2">
              <svg viewBox="0 0 96 96" className="w-full h-full">
                {/* Chest body */}
                <rect x="12" y="40" width="72" height="44" rx="4" fill="#5C4A32" />
                <rect x="12" y="40" width="72" height="44" rx="4" fill="none" stroke="#8B7355" strokeWidth="2" />
                {/* Chest lid */}
                <path d="M10 42 Q48 20 86 42" fill="#6B5B45" stroke="#8B7355" strokeWidth="2" />
                {/* Metal bands */}
                <rect x="12" y="55" width="72" height="4" rx="1" fill="#8B7355" opacity="0.4" />
                {/* Lock */}
                <circle cx="48" cy="58" r="6" fill="#FFD700" opacity="0.7" />
                <rect x="45" y="58" width="6" height="8" rx="1" fill="#FFD700" opacity="0.6" />
                {/* Coin glow based on savings */}
                {totalSaved > 0 && (
                  <g>
                    <ellipse cx="48" cy="35" rx={Math.min(20 + totalSaved / 5, 35)} ry={Math.min(10 + totalSaved / 8, 20)}
                      fill="#FFD700" opacity="0.1">
                      <animate attributeName="opacity" values="0.08;0.15;0.08" dur="3s" repeatCount="indefinite" />
                    </ellipse>
                    {/* Coins spilling out */}
                    {totalSaved >= 25 && <circle cx="30" cy="38" r="4" fill="#FFD700" opacity="0.5" />}
                    {totalSaved >= 50 && <circle cx="62" cy="36" r="3.5" fill="#FFD700" opacity="0.45" />}
                    {totalSaved >= 75 && <circle cx="38" cy="34" r="3" fill="#FFD700" opacity="0.4" />}
                  </g>
                )}
              </svg>
            </div>
            <p className="text-3xl font-bold text-cream">${totalSaved}</p>
            <p className="text-xs text-muted">kept by hitting your goals</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Goals passed</span>
              <span className="text-emerald-400 font-medium">{passedGoals} weeks</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Goals missed</span>
              <span className="text-red-400 font-medium">{chargedGoals} weeks</span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Total charged</span>
              <span className="text-red-400 font-medium">
                ${goalHistory.filter(g => g.status === 'charged').reduce((s, g) => s + (g.amount || 10), 0)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-cream font-medium">Net saved</span>
              <span className="text-violet-400 font-bold">${totalSaved}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak timeline */}
      {goalHistory.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-cream">Streak Timeline</h3>
            {streak > 0 && (
              <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {streak} week streak
              </span>
            )}
          </div>
          <StreakTimeline goalHistory={goalHistory} />
          {streak >= 3 && (
            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <p className="text-xs text-cyan-300">
                {streak >= 7 ? 'The kingdom glows with ancient light. Your discipline has restored what was lost.' :
                 streak >= 5 ? 'The waters run clear. Fish and coral thrive under your watch.' :
                 'Life returns to the reef. Keep the waters clean.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Weekly progress bars */}
      {goalHistory.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-cream mb-3">Weekly Progress</h3>
          <div className="space-y-3">
            {[...goalHistory].sort((a, b) => (b.weekStart || '').localeCompare(a.weekStart || '')).map((g, i) => {
              const pct = g.goalHours > 0 ? (g.screenTimeHours / g.goalHours) : 0;
              const passed = g.status === 'passed';
              const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted">{fmtDate(g.weekStart)} – {fmtDate(g.weekEnd)}</span>
                    <span className={`text-xs font-medium ${passed ? 'text-cyan-400' : 'text-red-400'}`}>
                      {g.screenTimeHours}h / {g.goalHours}h
                    </span>
                  </div>
                  <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        passed ? 'bg-gradient-to-r from-cyan-600 to-cyan-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                      }`}
                      style={{ width: `${Math.min(pct * 100, 100)}%`, transitionDelay: `${i * 100}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted mt-2">Bar = screen time used. Under the limit = waters cleared that week.</p>
        </div>
      )}
    </div>
  );
}
