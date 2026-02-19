import { writeFileSync } from 'fs';

const apps = ['Chrome', 'VS Code', 'Slack', 'Spotify', 'Zoom', 'Figma', 'Notion', 'Netflix', 'YouTube', 'Terminal'];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const data = [];
const d = new Date('2024-01-01');
const end = new Date('2024-12-31');

while (d <= end) {
  const date = d.toISOString().split('T')[0];
  const isWE = d.getDay() === 0 || d.getDay() === 6;
  const picked = [...apps].sort(() => Math.random() - 0.5).slice(0, isWE ? rand(2, 4) : rand(3, 6));
  const entries = picked.map(a => `${a} (${isWE ? rand(0, 4) : rand(0, 7)} hours ${rand(0, 59)} minutes)`);
  data.push({ date, entries });
  d.setDate(d.getDate() + 1);
}

writeFileSync('public/sample-data.json', JSON.stringify(data));
console.log(`Generated ${data.length} days`);
