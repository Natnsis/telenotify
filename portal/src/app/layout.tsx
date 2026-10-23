import type { Metadata } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import { themeInitScript } from '@/lib/theme';
import './globals.css';
import { RouteProgress } from '@/components/route-progress';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const display = Bricolage_Grotesque({ variable: '--font-display', subsets: ['latin'], weight: ['500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Telenotify: customer notifications on Telegram, with one API call',
  description:
    'Send order updates, OTPs and receipts on Telegram from your own branded bot. One API call, a free sandbox, and an instant signal when you should fall back to SMS.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is set by the script before React loads, so React must not warn about it.
    <html lang="en" data-theme="system" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} font-sans antialiased`}>
        <RouteProgress />
        {children}
      </body>
    </html>
  );
}
