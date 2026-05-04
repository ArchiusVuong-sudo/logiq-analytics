import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LogIQ — AI Logistics Analytics',
  description: 'AI-orchestrated analytics & forecasting on logistics data',
};

const setThemeScript = `(function(){try{var t=localStorage.getItem('logiq_theme')||'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: setThemeScript }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
