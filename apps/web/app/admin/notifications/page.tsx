import { AppShell } from '@/components/app-shell';
export default function AdminNotificationsPage(): React.ReactElement {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Notifications</h1>
          <p>
            Use <code>GET /api/v1/admin/notifications</code> for provider state and delivery
            history.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
