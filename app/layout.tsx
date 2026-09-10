import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dozer.ai — Presenter walkthrough',
  description: 'Internal sales walkthrough. Not a public page.',
  // Belt and braces with the X-Robots-Tag header in netlify.toml. This is an
  // internal sales tool and it has no business turning up in a search result
  // for a prospect who was never shown it.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex,nofollow" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
