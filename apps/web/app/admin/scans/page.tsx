import { AppShell } from '@/components/app-shell';
export default function AdminScansPage(): React.ReactElement {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Scans</h1>
          <p>
            Use <code>GET /api/v1/admin/scans</code> for recent scan health and snapshots.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
