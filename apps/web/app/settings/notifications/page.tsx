import { AppShell } from '@/components/app-shell';

export default function NotificationSettingsPage(): React.ReactElement {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Notifications</h1>
          <p>Only opted-in, verified destinations receive business messages.</p>
        </div>
      </div>
      <section className="detail-panel narrow-panel">
        <div className="provider-row">
          <div className="provider-icon">⌁</div>
          <div>
            <strong>Development console</strong>
            <p>Enabled. Notifications are persisted and logged by the local worker.</p>
          </div>
          <span className="status status-searching">Ready</span>
        </div>
        <div className="provider-row">
          <div className="provider-icon">W</div>
          <div>
            <strong>WhatsApp</strong>
            <p>
              Add and verify an E.164 phone number, explicitly opt in, then configure the Cloud API
              credentials.
            </p>
          </div>
          <span className="status status-paused">Setup required</span>
        </div>
      </section>
    </AppShell>
  );
}
