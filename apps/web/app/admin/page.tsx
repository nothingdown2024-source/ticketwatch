import Link from 'next/link';
import { AppShell } from '@/components/app-shell';

export default function AdminPage(): React.ReactElement {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>System overview</h1>
          <p>Admin-only metrics are available through the versioned API.</p>
        </div>
      </div>
      <section className="settings-list">
        <Link href="/admin/sources">
          <div>
            <strong>Sources</strong>
            <p>Monitor state, adapter, failures, and attached watches.</p>
          </div>
          <span>→</span>
        </Link>
        <Link href="/admin/scans">
          <div>
            <strong>Scans</strong>
            <p>HTTP/browser mode, duration, parsed result, and failure class.</p>
          </div>
          <span>→</span>
        </Link>
        <Link href="/admin/notifications">
          <div>
            <strong>Notifications</strong>
            <p>Queue, provider acceptance, delivery, and failures.</p>
          </div>
          <span>→</span>
        </Link>
      </section>
    </AppShell>
  );
}
