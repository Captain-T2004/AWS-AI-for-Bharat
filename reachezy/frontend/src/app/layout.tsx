import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReachEzy — Turn Your Vibe into Your Brand',
  description:
    "Professional AI-powered media kits and brand discovery for India's next generation of creators. Build credibility, showcase metrics, and land premium brand deals.",
  openGraph: {
    title: 'ReachEzy — Turn Your Vibe into Your Brand',
    description:
      "AI-powered media kits and brand discovery for India's next generation of creators.",
    type: 'website',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts: Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols Outlined */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-light font-display text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
