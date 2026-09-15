import { AppShell } from '@/components/app-shell';
export default function AdminSourcesPage(): React.ReactElement {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Sources</h1>
          <p>
            Use <code>GET /api/v1/admin/sources</code> for the current operational listing.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
