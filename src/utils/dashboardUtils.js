export const VIVID = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F97316', '#06B6D4', '#EC4899', '#84CC16', '#F43F5E', '#8B5CF6'];
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Brand colors for common apps (case-insensitive lookup)
export const APP_BRAND_COLORS = {
  // Social
  'instagram':        '#E4405F',
  'tiktok':           '#EE1D52',
  'facebook':         '#1877F2',
  'x':                '#1D9BF0',
  'twitter':          '#1D9BF0',
  'snapchat':         '#FFFC00',
  'reddit':           '#FF4500',
  'pinterest':        '#E60023',
  'linkedin':         '#0A66C2',
  'threads':          '#A0A0A0',
  'bluesky':          '#0085FF',
  // Messaging
  'whatsapp':         '#25D366',
  'messenger':        '#0084FF',
  'telegram':         '#26A5E4',
  'discord':          '#5865F2',
  'signal':           '#3A76F0',
  'messages':         '#34C759',
  'slack':            '#E01E5A',
  'microsoft teams':  '#6264A7',
  'teams':            '#6264A7',
  // Video & Streaming
  'youtube':          '#FF0000',
  'netflix':          '#E50914',
  'twitch':           '#9146FF',
  'prime video':      '#00A8E1',
  'disney+':          '#113CCF',
  'hulu':             '#1CE783',
  'max':              '#002BE7',
  'hbo max':          '#002BE7',
  'crunchyroll':      '#F47521',
  'peacock':          '#2072B2',
  // Music & Audio
  'spotify':          '#1DB954',
  'apple music':      '#FC3C44',
  'music':            '#FC3C44',
  'podcasts':         '#9933CC',
  'soundcloud':       '#FF5500',
  'audible':          '#F8991D',
  // Browsers
  'safari':           '#006CFF',
  'chrome':           '#4285F4',
  'google chrome':    '#4285F4',
  'firefox':          '#FF7139',
  // Apple System
  'facetime':         '#32D74B',
  'mail':             '#147EFB',
  'photos':           '#A8D8FF',
  'phone':            '#65D759',
  'maps':             '#30D158',
  'app store':        '#0D84FF',
  'settings':         '#8E8E93',
  'notes':            '#FFD60A',
  'reminders':        '#007AFF',
  'calendar':         '#FF3B30',
  'weather':          '#5AC8FA',
  'clock':            '#FF9F0A',
  'news':             '#FC3158',
  'health':           '#FF2D55',
  'files':            '#339DFF',
  'find my':          '#5EDA64',
  'shortcuts':        '#EF5B5B',
  'books':            '#F3983E',
  // Google
  'gmail':            '#EA4335',
  'google maps':      '#34A853',
  'google':           '#4285F4',
  'google drive':     '#0DA960',
  'google photos':    '#4285F4',
  // Shopping & Delivery
  'amazon':           '#FF9900',
  'amazon shopping':  '#FF9900',
  'doordash':         '#FF3008',
  'uber eats':        '#06C167',
  'instacart':        '#43B02A',
  'temu':             '#F05A22',
  'shein':            '#E24726',
  // Transport
  'uber':             '#276EF1',
  'lyft':             '#FF00BF',
  // Finance
  'venmo':            '#3D95CE',
  'cash app':         '#00D632',
  'paypal':           '#009CDE',
  'robinhood':        '#00C805',
  // Productivity
  'zoom':             '#2D8CFF',
  'notion':           '#EFEFEF',
  // Dating
  'tinder':           '#FF6B6B',
  'bumble':           '#FFC629',
  'hinge':            '#B5304F',
  // Gaming
  'roblox':           '#E2231A',
  // Food & Drink
  'starbucks':        '#00704A',
};

// Returns dark or light text color based on background luminance
export const contrastText = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1a1510' : '#ffffff';
};

export const darkChart = {
  chart: { toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#9a8e80', background: 'transparent' },
  grid: { borderColor: '#3e3830', strokeDashArray: 3 },
  dataLabels: { enabled: false },
  legend: { position: 'bottom', fontSize: '12px', labels: { colors: '#9a8e80' } },
  tooltip: { theme: 'dark' },
};

export const fmt = m => { const h = Math.floor(m / 60); const mn = Math.round(m % 60); return h > 0 ? `${h}h ${mn}m` : `${mn}m`; };
export const ttFmt = v => { const m = v * 60; const h = Math.floor(m / 60); const mn = Math.round(m % 60); return h > 0 ? `${h}h ${mn}m` : `${mn}m`; };
