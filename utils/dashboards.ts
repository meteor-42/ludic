export const formatMsk = (iso: string) => {
  try {
    const d = new Date(iso);
    const mskDate = new Date(d.toLocaleString("en-US", {timeZone: "Europe/Moscow"}));
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const wd = weekdays[mskDate.getDay()];
    const dd = String(mskDate.getDate()).padStart(2, '0');
    const mm = String(mskDate.getMonth() + 1).padStart(2, '0');
    const hh = String(mskDate.getHours()).padStart(2, '0');
    const min = String(mskDate.getMinutes()).padStart(2, '0');
    return `${dd}.${mm} ${hh}:${min}`;
  } catch {
    return '';
  }
};

export const statusLabel = (s?: string) => {
  switch ((s || '').toLowerCase()) {
    case 'live':
      return 'LIVE';
    case 'completed':
      return 'ЗАВЕРШЕНО';
    case 'cancelled':
      return 'ОТМЕНЕН';
    case 'upcoming':
    default:
      return 'ОЖИДАЕТСЯ';
  }
};

export const statusClass = (s?: string) => {
  const v = (s || '').toLowerCase();
  if (v === 'live') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  if (v === 'upcoming') return 'bg-emerald-50 text-emerald-700';
  if (v === 'cancelled') return 'bg-rose-50 text-rose-700';
  if (v === 'completed') return 'bg-slate-100 text-slate-700';
  return 'bg-slate-100 text-slate-700';
};
