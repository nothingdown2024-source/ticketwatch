import { AlertWizard } from '@/components/alert-wizard';
import { AppShell } from '@/components/app-shell';

export default function NewAlertPage(): React.ReactElement {
  return (
    <AppShell>
      <AlertWizard />
    </AppShell>
  );
}
