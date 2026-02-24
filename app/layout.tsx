import type { Metadata } from 'next';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '@/context/AuthContext';
import { APP_NAME } from '@/utils/constants';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'پنل مدیریت صندوق قرض‌الحسنه',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AuthProvider>
          {children}
          <ToastContainer position="top-center" rtl theme="light" autoClose={4000} />
        </AuthProvider>
      </body>
    </html>
  );
}
