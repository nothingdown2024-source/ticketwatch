const labels: Record<string, string> = {
  PENDING: 'Starting',
  SEARCHING: 'Searching',
  AVAILABLE: 'Tickets found',
  NOTIFIED: 'Tickets found',
  PAUSED: 'Paused',
  ERROR: 'Problem checking source',
  DISABLED: 'Disabled',
};

export function StatusPill({ status }: { status: string }): React.ReactElement {
  return (
    <span className={`status status-${status.toLowerCase()}`}>{labels[status] ?? status}</span>
  );
}
