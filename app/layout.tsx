import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-sans',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'YapShield | Think freely, share safely',
    template: '%s | YapShield',
  },
  description:
    'Privacy and safety gateway for generative AI applications. Real-time Indian PII scanning, secrets detection, prompt injection scoring, and reversible AES-256-GCM vault tokenization.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#050c15',
  colorScheme: 'dark light',
};

// Fixed constant string for anti-flash theme script (not constructed from user input)
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('yapshield-theme');var m=window.matchMedia('(prefers-color-scheme: dark)');var t=(s==='light'||s==='dark')?s:(m.matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased bg-[var(--bg)] text-[var(--text)] min-h-screen flex flex-col font-sans selection:bg-[var(--accent)]/20 selection:text-[var(--text)]">
        <Navbar />
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
