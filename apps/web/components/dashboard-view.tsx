'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusPill } from './status-pill';

interface AlertSummary {
  id: string;
  query: string;
  notificationChannel: string;
  createdAt: string;
  state: { status: string; availability: string } | null;
  source: {
    displayName: string | null;
    host: string;
    monitor: { lastSuccessAt: string | null; nextCheckAt: string } | null;
  };
}

function time(value: string | null | undefined): string {
  if (!value) return 'Not checked yet';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function DashboardView(): React.ReactElement {
  const [alerts, setAlerts] = useState<AlertSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ data: AlertSummary[] }>('/alerts')
      .then(({ data }) => setAlerts(data))
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Unable to load alerts.'),
      );
  }, []);

  if (error)
    return (
      <section className="empty-state">
        <h2>We couldn&apos;t load your alerts</h2>
        <p>{error}</p>
        <Link className="button" href="/login">
          Sign in again
        </Link>
      </section>
    );
  if (alerts === null)
    return (
      <div className="loading-state" role="status">
        <span />
        Loading your alerts…
      </div>
    );
  const found = alerts.filter(({ state }) => state?.availability === 'AVAILABLE').length;
  const latestScan =
    alerts
      .map(({ source }) => source.monitor?.lastSuccessAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Your ticket signals</h1>
          <p>Quiet while nothing changes. Immediate when it matters.</p>
        </div>
        <Link className="button" href="/alerts/new">
          Create alert
        </Link>
      </div>
      <section className="summary-grid" aria-label="Alert summary">
        <article>
          <span>Active alerts</span>
          <strong>
            {
              alerts.filter(({ state }) => !['PAUSED', 'DISABLED'].includes(state?.status ?? ''))
                .length
            }
          </strong>
          <small>Shared-source monitoring</small>
        </article>
        <article>
          <span>Tickets found</span>
          <strong>{found}</strong>
          <small>{found ? 'Ready to book' : 'Still watching'}</small>
        </article>
        <article>
          <span>Last scan</span>
          <strong className="summary-time">{time(latestScan)}</strong>
          <small>Successful checks only</small>
        </article>
        <article>
          <span>Notification status</span>
          <strong className="summary-time">Console ready</strong>
          <small>WhatsApp can be connected</small>
        </article>
      </section>
      <section className="alerts-section">
        <div className="section-heading">
          <h2>Your alerts</h2>
          <span>{alerts.length} total</span>
        </div>
        {alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              ◎
            </div>
            <h3>No alerts yet</h3>
            <p>Create your first ticket alert and let TicketWatch do the refreshing.</p>
            <Link className="button" href="/alerts/new">
              Create your first alert
            </Link>
          </div>
        ) : (
          <div className="alert-list">
            {alerts.map((alert) => (
              <Link className="alert-card" href={`/alerts/${alert.id}`} key={alert.id}>
                <div className="alert-title">
                  <span className="movie-initial" aria-hidden="true">
                    {alert.query.charAt(0)}
                  </span>
                  <div>
                    <h3>{alert.query}</h3>
                    <p>{alert.source.displayName ?? alert.source.host}</p>
                  </div>
                </div>
                <StatusPill status={alert.state?.status ?? 'PENDING'} />
                <dl>
                  <div>
                    <dt>Last successful check</dt>
                    <dd>{time(alert.source.monitor?.lastSuccessAt)}</dd>
                  </div>
                  <div>
                    <dt>Next expected check</dt>
                    <dd>{time(alert.source.monitor?.nextCheckAt)}</dd>
                  </div>
                  <div>
                    <dt>Notification</dt>
                    <dd>
                      {alert.notificationChannel === 'WHATSAPP'
                        ? 'WhatsApp'
                        : 'Development console'}
                    </dd>
                  </div>
                </dl>
                <span className="card-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
