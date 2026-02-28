export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface Member {
  id: string;
  fullName: string;
  phone: string;
  nationalId?: string; // کد ملی — برای اتصال حساب از ربات تلگرام
  joinDate: string;
  monthlyAmount: number;
  status: 'active' | 'inactive';
  loanAmount?: number;
  deposit?: number;
  loanBalance?: number;
  telegramChatId?: string;
  createdAt: string;
}

export interface LoanRequest {
  id: string;
  telegramChatId: string;
  userName: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  type: 'contribution' | 'repayment';
  note?: string;
  createdAt: string;
  /** مسیر عکس رسید (برای پرداخت‌های ثبت‌شده از تایید رسید تلگرام) */
  receiptImagePath?: string;
}

export interface Loan {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  dueMonths: number;
  status: 'active' | 'settled';
  note?: string;
  createdAt: string;
  /** برای یادآوری سررسید (ارسال پیام تلگرام) */
  reminder7dSent?: boolean;
  reminder3dSent?: boolean;
  reminder1dSent?: boolean;
  reminderDueCount?: number;
  reminderDueFirstSentAt?: string;
}

export interface FundLogEntry {
  id: string;
  type: 'in' | 'out';
  amount: number;
  memberId?: string;
  refType: string;
  refId?: string;
  date: string;
  note?: string;
  createdAt: string;
}

/** رسید پرداخت شخصی/خانوادگی ارسالی از ربات تلگرام — در انتظار تایید ادمین */
export interface ReceiptSubmission {
  id: string;
  memberId: string;
  memberName: string;
  imagePath: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  /** توضیحات / اسامی افراد تحت تکفل (پرداخت خانوادگی) */
  note?: string;
}
