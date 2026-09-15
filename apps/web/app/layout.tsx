import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'TicketWatch', template: '%s · TicketWatch' },
  description: 'Track the movies you are waiting for and know when ticket availability appears.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f8f5' };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
