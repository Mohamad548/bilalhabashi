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
 * تاریخ شمسی برای نمایش (مثلاً ۱۴۰۲/۰۱/۱۵)
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
