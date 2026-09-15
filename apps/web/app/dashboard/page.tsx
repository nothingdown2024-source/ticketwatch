import { AppShell } from '@/components/app-shell';
import { DashboardView } from '@/components/dashboard-view';

export default function DashboardPage(): React.ReactElement {
  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
