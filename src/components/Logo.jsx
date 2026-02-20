// fScreentime.app logo — hourglass icon with gradient
export default function Logo({ size = 32, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#d4aa80" />
            <stop offset="100%" stopColor="#c4956a" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#logo-grad)" />
        <path d="M14 10h12M14 30h12M14 10c0 5 6 8 6 10s-6 5-6 10M26 10c0 5-6 8-6 10s6 5 6 10"
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="24" r="2" fill="white" fillOpacity="0.6" />
      </svg>
    </div>
  );
}

export function LogoText({ size = 32, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} />
      <span className="font-semibold tracking-tight text-caramel" style={{ fontSize: size * 0.5 }}>
        fScreentime<span className="text-muted">.app</span>
      </span>
    </div>
  );
}
