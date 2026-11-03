import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Link from 'next/link';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'YapShield - Think freely, share safely',
  description:
    'Production-grade AI guardrails, prompt injection detection, and reversible tokenization for LLM applications.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100 min-h-screen flex flex-col`}
      >
        {/* Shared Top Navigation Bar */}
        <nav className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6 sm:gap-8">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-bold tracking-tight text-white hover:opacity-90 transition"
              >
                <span className="text-emerald-400 text-xl">🛡️</span>
                <span>
                  Yap<span className="text-emerald-400">Shield</span>
                </span>
              </Link>

              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
                >
                  Home
                </Link>
                <Link
                  href="/playground"
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
                >
                  Playground
                </Link>
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
                >
                  Dashboard
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gateway Active
              </span>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
