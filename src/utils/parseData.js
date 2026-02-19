// Parses raw screen time data in format: "App Name (XX hours YY minutes)"
// Each entry in the array has { date, entries: ["App1 (1 hours 30 minutes)", ...] }
// OR flat array of { app, time, date } objects

export function parseScreenTimeData(raw) {
  if (!Array.isArray(raw)) return [];

  // Check if data is already structured { app, time, date }
  if (raw.length > 0 && (raw[0].app || raw[0].application || raw[0].name)) {
    return raw.map(entry => ({
      app: entry.app || entry.application || entry.name || 'Unknown',
      minutes: parseFloat(entry.time || entry.duration || entry.screenTime || 0),
      date: entry.date || entry.timestamp || 'Unknown',
    }));
  }

  // Parse "App Name (XX hours YY minutes)" format
  // Expects: [{ date: "2024-01-15", entries: ["Chrome (2 hours 30 minutes)", ...] }]
  const results = [];
  raw.forEach(day => {
    const date = day.date || day.timestamp;
    const entries = day.entries || [];
    (Array.isArray(entries) ? entries : [entries]).forEach(line => {
      const match = line.match(/^(.+?)\s*\((\d+)\s*hours?\s*(\d+)\s*minutes?\)/i);
      if (match) {
        results.push({
          app: match[1].trim(),
          minutes: parseInt(match[2]) * 60 + parseInt(match[3]),
          date,
        });
      }
    });
  });
  return results;
}
