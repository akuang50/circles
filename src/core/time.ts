export function localDateISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysISO(dateISO: string, days: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  return localDateISO(next);
}

export function endOfLocalDayISO(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

export function formatDayLabel(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(hhmm: string) {
  const [h, min] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(h, min, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isPastCutoff(cutoffHour: number, now = new Date()) {
  return now.getHours() >= cutoffHour;
}
