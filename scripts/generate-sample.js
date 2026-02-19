// Generates a full-year sample dataset for testing
const apps = ['Chrome', 'VS Code', 'Slack', 'Spotify', 'Zoom', 'Figma', 'Notion', 'Netflix', 'YouTube', 'Terminal'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const data = [];
const start = new Date('2024-01-01');
const end = new Date('2024-12-31');

for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const date = d.toISOString().split('T')[0];
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  const numApps = isWeekend ? rand(2, 4) : rand(3, 6);
  const shuffled = [...apps].sort(() => Math.random() - 0.5).slice(0, numApps);
  const entries = shuffled.map(app => {
    const h = isWeekend ? rand(0, 4) : rand(0, 7);
    const m = rand(0, 59);
    return `${app} (${h} hours ${m} minutes)`;
  });
  data.push({ date, entries });
}

console.log(JSON.stringify(data, null, 2));
