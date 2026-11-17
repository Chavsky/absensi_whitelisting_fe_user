/**
 * Time and date formatting utilities for Indonesia timezone (Asia/Jakarta / WIB)
 */

export function getIndonesianDate(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('id-ID');
  }
}

export function getJakartaDateISO(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = value('year');
  const month = value('month');
  const day = value('day');
  if (!year || !month || !day) throw new Error('Tanggal Asia/Jakarta tidak dapat ditentukan.');
  return `${year}-${month}-${day}`;
}

export function getIndonesianTime(date: Date = new Date(), withSeconds: boolean = true): string {
  try {
    const formatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined,
      hour12: false,
    }).format(date);

    // Replace dot separator if id-ID uses dots e.g. 08.30.00 -> 08:30:00
    return formatted.replace(/\./g, ':');
  } catch {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}${withSeconds ? `:${pad(date.getSeconds())}` : ''}`;
  }
}

export function formatTimeWithWIB(timeStr: string | null | undefined): string {
  if (!timeStr) return '-';
  if (timeStr.includes('WIB')) return timeStr;
  if (timeStr.includes('T')) {
    const parsed = new Date(timeStr);
    if (!Number.isNaN(parsed.getTime())) {
      const formatted = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(parsed).replace(/\./g, ':');
      return `${formatted} WIB`;
    }
  }
  return `${timeStr} WIB`;
}
