'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusPill } from './status-pill';

interface AlertDetailData {
  id: string;
  query: string;
  matchMode: string;
  notificationChannel: string;
  createdAt: string;
  aliases: Array<{ alias: string }>;
  state: {
    status: string;
    availability: string;
    lastMatchedListing: Record<string, unknown> | null;
  } | null;
  source: {
    id: string;
    normalizedUrl: string;
    displayName: string | null;
    monitor: { lastSuccessAt: string | null; nextCheckAt: string } | null;
    scans: Array<{ id: string; status: string; createdAt: string; errorCode: string | null }>;
  };
  availabilityEvents: Array<{
    id: string;
    type: string;
    occurredAt: string;
    matchedListing: { title: string; bookingUrl: string | null } | null;
    notifications: Array<{ status: string; sentAt: string | null }>;
  }>;
}

const date = (value: string | null | undefined): string =>
  value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : 'Not yet';

export function AlertDetail(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [alert, setAlert] = useState<AlertDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      api<{ data: AlertDetailData }>(`/alerts/${params.id}`)
        .then(({ data }) => setAlert(data))
        .catch((caught: unknown) =>
          setError(caught instanceof Error ? caught.message : 'Unable to load alert.'),
        ),
    [params.id],
  );
  useEffect(() => {
    void load();
  }, [load]);

  async function action(name: 'pause' | 'resume'): Promise<void> {
    await api(`/alerts/${params.id}/${name}`, { method: 'POST' });
    await load();
  }
  async function changeFixture(): Promise<void> {
    if (!alert) return;
    await api('/sources/demo/fixture', {
      method: 'POST',
      body: JSON.stringify({ sourceId: alert.source.id, fixtureState: 'state-2' }),
    });
    await load();
  }
  async function remove(): Promise<void> {
    await api(`/alerts/${params.id}`, { method: 'DELETE' });
    router.push('/dashboard');
  }

  if (error)
    return (
      <section className="empty-state">
        <h2>Alert unavailable</h2>
        <p>{error}</p>
        <Link className="button" href="/dashboard">
          Return to dashboard
        </Link>
      </section>
    );
  if (!alert)
    return (
      <div className="loading-state" role="status">
        <span />
        Loading alert…
      </div>
    );
  const matched = alert.availabilityEvents[0]?.matchedListing;

  return (
    <>
      <Link className="back-link" href="/dashboard">
        ← All alerts
      </Link>
      <header className="detail-heading">
        <div>
          <p className="eyebrow">Ticket alert</p>
          <h1>{alert.query}</h1>
          <p>{alert.source.displayName}</p>
        </div>
        <StatusPill status={alert.state?.status ?? 'PENDING'} />
      </header>
      <div className="detail-actions">
        {alert.state?.status === 'PAUSED' ? (
          <button className="button" onClick={() => void action('resume')}>
            Resume alert
          </button>
        ) : (
          <button className="button-secondary" onClick={() => void action('pause')}>
            Pause alert
          </button>
        )}
        {process.env.NODE_ENV !== 'production' && (
          <button className="button-secondary" onClick={() => void changeFixture()}>
            Simulate Avatar availability
          </button>
        )}
        <button className="danger-link" onClick={() => void remove()}>
          Delete alert
        </button>
      </div>
      <section className="detail-grid">
        <article className="detail-panel">
          <h2>Monitoring</h2>
          <dl className="facts">
            <div>
              <dt>Current state</dt>
              <dd>{alert.state?.availability.toLowerCase().replace('_', ' ')}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                <a href={alert.source.normalizedUrl} target="_blank" rel="noreferrer">
                  {new URL(alert.source.normalizedUrl).host} ↗
                </a>
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{date(alert.createdAt)}</dd>
            </div>
            <div>
              <dt>Last successful check</dt>
              <dd>{date(alert.source.monitor?.lastSuccessAt)}</dd>
            </div>
            <div>
              <dt>Next expected check</dt>
              <dd>{date(alert.source.monitor?.nextCheckAt)}</dd>
            </div>
            <div>
              <dt>Scans recorded</dt>
              <dd>{alert.source.scans.length}</dd>
            </div>
            <div>
              <dt>Match mode</dt>
              <dd>{alert.matchMode.toLowerCase()}</dd>
            </div>
            <div>
              <dt>Aliases</dt>
              <dd>{alert.aliases.map(({ alias }) => alias).join(', ') || 'None'}</dd>
            </div>
          </dl>
          {matched?.bookingUrl && (
            <a
              className="button full-button"
              href={matched.bookingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open official booking page
            </a>
          )}
        </article>
        <article className="detail-panel">
          <h2>History</h2>
          <div className="timeline">
            <TimelineItem
              title="Alert created"
              time={alert.createdAt}
              detail="Monitoring started."
            />
            {alert.source.scans.slice(0, 8).map((scan) => (
              <TimelineItem
                key={scan.id}
                title={scan.status === 'SUCCEEDED' ? 'Source checked' : 'Problem checking source'}
                time={scan.createdAt}
                detail={
                  scan.errorCode ??
                  (alert.availabilityEvents.some((event) => event.id === scan.id)
                    ? 'Tickets detected.'
                    : 'Scan recorded.')
                }
              />
            ))}
            {alert.availabilityEvents.map((event) => (
              <TimelineItem
                key={event.id}
                title="Tickets detected"
                time={event.occurredAt}
                detail={`${event.matchedListing?.title ?? alert.query} · Notification ${event.notifications[0]?.status.toLowerCase() ?? 'queued'}`}
                highlight
              />
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function TimelineItem({
  title,
  time,
  detail,
  highlight = false,
}: {
  title: string;
  time: string;
  detail: string;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <div className={`timeline-item${highlight ? ' highlight' : ''}`}>
      <span aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        <small>{date(time)}</small>
      </div>
    </div>
  );
}
