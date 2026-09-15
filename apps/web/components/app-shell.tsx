import Link from 'next/link';
import { Logo } from './logo';

export function AppShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="app-frame">
      <header className="app-header">
        <Logo />
        <nav aria-label="Main navigation">
          <Link href="/dashboard">Alerts</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        <Link className="button button-small" href="/alerts/new">
          Create alert
        </Link>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
