import Link from 'next/link';
import { AppShell } from '@/components/app-shell';

export default function SettingsPage(): React.ReactElement {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
          <p>Manage notification consent and account data.</p>
        </div>
      </div>
      <section className="settings-list">
        <Link href="/settings/notifications">
          <div>
            <strong>Notifications</strong>
            <p>WhatsApp verification, consent, and development provider.</p>
          </div>
          <span>→</span>
        </Link>
        <article>
          <div>
            <strong>Privacy and account data</strong>
            <p>Account deletion is represented as an audited soft-delete and retention workflow.</p>
          </div>
          <button className="button-secondary" disabled>
            Coming next
          </button>
        </article>
      </section>
    </AppShell>
  );
}
