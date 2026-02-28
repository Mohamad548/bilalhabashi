/**
 * فرمت مبلغ به تومان با جداکننده هزارگان
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
}

/**
 * فرمت عدد ساده
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value);
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const PERSIAN_ARABIC_DIGITS = /[۰-۹٠-٩]/g;
const DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};
function toPersianDigits(str: string): string {
  return str.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}
/** تبدیل اعداد فارسی/عربی به ASCII برای محاسبه */
function toAsciiDigits(dateStr: string): string {
  return dateStr.replace(PERSIAN_ARABIC_DIGITS, (c) => DIGIT_MAP[c] ?? c);
}

/**
 * نرمال‌سازی تاریخ به YYYY-MM-DD (با پشتیبانی از اعداد فارسی و اسلش/خط تیره)
 */
function normalizeDateStr(dateStr: string): string {
  if (!dateStr?.trim()) return '';
  let s = dateStr.trim();
  if (s.includes('T')) s = s.slice(0, 10);
  s = toAsciiDigits(s);
  if (s.includes('/')) {
    const parts = s.split('/').map((p) => p.trim());
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (c.length >= 4) return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
      if (a.length >= 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    }
  }
  return s;
}

/**
 * تبدیل تاریخ میلادی (Date یا ISO رشته) به رشته تاریخ شمسی YYYY-MM-DD
 */
export function gregorianToShamsi(gregorianDate: Date | string): string {
  const g = typeof gregorianDate === 'string' ? new Date(gregorianDate) : gregorianDate;
  if (isNaN(g.getTime())) return '';
  const gy = g.getFullYear();
  const gm = g.getMonth() + 1;
  const gd = g.getDate();
  let g_d_n = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][gm - 1] + gd;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  if (gm > 2 && isLeap) g_d_n += 1;
  let jy = gy <= 1600 ? 0 : 979;
  const gy2 = gy - (gy <= 1600 ? 621 : 1600);
  let j_d_n = 365 * gy2 + Math.floor((gy2 + 3) / 4) - 79;
  const j_np = Math.floor(j_d_n / 12053);
  j_d_n %= 12053;
  jy += 33 * j_np + Math.floor((j_d_n - 1) / 1461);
  j_d_n = (j_d_n - 1) % 1461;
  jy += Math.floor(j_d_n / 365);
  j_d_n %= 365;
  let jm: number;
  let jd: number;
  if (j_d_n < 186) {
    jm = 1 + Math.floor(j_d_n / 31);
    jd = 1 + (j_d_n % 31);
  } else {
    jm = 7 + Math.floor((j_d_n - 186) / 30);
    jd = 1 + ((j_d_n - 186) % 30);
  }
  return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
}

/**
 * نمایش تاریخ شمسی از رشته ISO (مثلاً برای createdAt)
 */
export function formatDateShamsiFromIso(isoStr: string | undefined | null): string {
  if (!isoStr?.trim()) return '—';
  const datePart = isoStr.split('T')[0];
  const shamsi = gregorianToShamsi(datePart);
  if (!shamsi) return '—';
  const display = shamsi.replace(/-/g, '/');
  return toPersianDigits(display);
}

/**
 * تاریخ شمسی برای نمایش (ورودی قبلاً شمسی YYYY-MM-DD است، مثلاً ۱۴۰۲/۰۱/۱۵)
 */
export function formatDateShort(dateStr: string): string {
  const normalized = normalizeDateStr(dateStr);
  if (!normalized) return '—';
  const display = normalized.replace(/-/g, '/');
  return toPersianDigits(display);
}

/**
 * اضافه کردن تعداد ماه به تاریخ شمسی (YYYY-MM-DD) و برگرداندن تاریخ سررسید
 */
export function addMonthsToDate(dateStr: string, months: number): string {
  const normalized = normalizeDateStr(dateStr);
  if (!normalized || months < 0) return '';
  const [y, m, d] = normalized.split('-').map(Number);
  let newMonth = m + months;
  let newYear = y;
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }
  const lastDay = Math.min(d, 30);
  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}
