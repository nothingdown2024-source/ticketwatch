'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

interface Listing {
  title: string;
  language: string | null;
  format: string | null;
  bookingStatus: string;
}
interface Preview {
  supported: boolean;
  adapter: { displayName: string };
  detectedTitle: string | null;
  listings: Listing[];
  scanMode: string;
  warnings: string[];
}

const steps = ['Source', 'Movie', 'Match', 'Notification', 'Review'];

export function AlertWizard(): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState('https://demo.ticketwatch.local/cinema/hyderabad');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [query, setQuery] = useState('Avatar Fire and Ash');
  const [aliases, setAliases] = useState('Avatar 3');
  const [matchMode, setMatchMode] = useState('ALIASES');
  const [channel, setChannel] = useState('CONSOLE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function validateSource(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await api<{ data: Preview }>('/sources/preview', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      setPreview(response.data);
      setStep(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'This source could not be checked.');
    } finally {
      setLoading(false);
    }
  }

  async function create(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await api<{ data: { id: string } }>('/alerts', {
        method: 'POST',
        body: JSON.stringify({
          sourceUrl: url,
          query,
          aliases: aliases
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          matchMode,
          notificationChannel: channel,
        }),
      });
      router.push(`/alerts/${response.data.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The alert could not be created.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wizard-layout">
      <aside>
        <p className="eyebrow">New alert</p>
        <h1>Tell us what to watch.</h1>
        <ol>
          {steps.map((label, index) => (
            <li className={index === step ? 'active' : index < step ? 'done' : ''} key={label}>
              <span>{index < step ? '✓' : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </aside>
      <section className="wizard-card">
        {step === 0 && (
          <>
            <p className="step-label">Step 1 of 5</p>
            <h2>Add a ticket website</h2>
            <p>Paste a supported public cinema or booking page.</p>
            <label>
              Ticket page URL
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                type="url"
                required
              />
            </label>
            <div className="info-note">
              <span aria-hidden="true">i</span>
              <p>
                <strong>Secure by default</strong> Private networks and unsupported protocols are
                rejected before any outbound request.
              </p>
            </div>
            <button className="button" onClick={() => void validateSource()} disabled={loading}>
              {loading ? 'Scanning source…' : 'Validate and scan'}
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <p className="step-label">Step 2 of 5</p>
            <h2>Choose a movie</h2>
            {preview && (
              <div className="source-confirm">
                <span>✓</span>
                <div>
                  <strong>{preview.detectedTitle}</strong>
                  <small>
                    {preview.adapter.displayName} · {preview.scanMode} scan
                  </small>
                </div>
              </div>
            )}
            <fieldset>
              <legend>Currently detected movies</legend>
              <div className="movie-options">
                {preview?.listings.map((movie) => (
                  <label key={movie.title}>
                    <input
                      type="radio"
                      name="movie"
                      checked={query === movie.title.replace(':', '')}
                      onChange={() => setQuery(movie.title.replace(':', ''))}
                    />
                    <span>
                      <strong>{movie.title}</strong>
                      <small>{[movie.language, movie.format].filter(Boolean).join(' · ')}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Or enter a custom movie keyword
              <input value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              Aliases <small>Comma-separated</small>
              <input
                value={aliases}
                onChange={(event) => setAliases(event.target.value)}
                placeholder="Avatar 3, Avatar sequel"
              />
            </label>
            <WizardNav back={() => setStep(0)} next={() => setStep(2)} />
          </>
        )}
        {step === 2 && (
          <>
            <p className="step-label">Step 3 of 5</p>
            <h2>How should it match?</h2>
            <p>Precise matching prevents noisy, accidental alerts.</p>
            <div className="choice-grid">
              {[
                ['CONTAINS', 'Contains', 'Matches when the full keyword appears in a listing.'],
                ['EXACT', 'Exact', 'Only matches the normalized full movie title.'],
                ['ALIASES', 'Aliases', 'Matches the title or any aliases you supplied.'],
              ].map(([value, title, copy]) => (
                <label className={matchMode === value ? 'selected' : ''} key={value}>
                  <input
                    type="radio"
                    name="mode"
                    value={value}
                    checked={matchMode === value}
                    onChange={() => setMatchMode(value!)}
                  />
                  <strong>{title}</strong>
                  <small>{copy}</small>
                </label>
              ))}
            </div>
            <WizardNav back={() => setStep(1)} next={() => setStep(3)} />
          </>
        )}
        {step === 3 && (
          <>
            <p className="step-label">Step 4 of 5</p>
            <h2>Choose the signal</h2>
            <p>Console notifications make the full local flow work without external credentials.</p>
            <div className="choice-grid">
              <label className={channel === 'CONSOLE' ? 'selected' : ''}>
                <input
                  type="radio"
                  checked={channel === 'CONSOLE'}
                  onChange={() => setChannel('CONSOLE')}
                />
                <strong>Development console</strong>
                <small>Ready now and persisted in notification history.</small>
              </label>
              <label className={channel === 'WHATSAPP' ? 'selected' : ''}>
                <input
                  type="radio"
                  checked={channel === 'WHATSAPP'}
                  onChange={() => setChannel('WHATSAPP')}
                />
                <strong>WhatsApp</strong>
                <small>Requires verified phone, explicit opt-in, and Cloud API credentials.</small>
              </label>
            </div>
            <WizardNav back={() => setStep(2)} next={() => setStep(4)} />
          </>
        )}
        {step === 4 && (
          <>
            <p className="step-label">Step 5 of 5</p>
            <h2>Review your alert</h2>
            <dl className="review-list">
              <div>
                <dt>Movie</dt>
                <dd>{query}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{preview?.detectedTitle}</dd>
              </div>
              <div>
                <dt>Monitoring interval</dt>
                <dd>
                  About every 3 minutes <small>15 seconds in local development</small>
                </dd>
              </div>
              <div>
                <dt>Matching</dt>
                <dd>{matchMode.toLowerCase()}</dd>
              </div>
              <div>
                <dt>Notification</dt>
                <dd>{channel === 'CONSOLE' ? 'Development console' : 'WhatsApp'}</dd>
              </div>
            </dl>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <WizardNav
              back={() => setStep(3)}
              next={() => void create()}
              nextLabel={loading ? 'Starting…' : 'Start monitoring'}
              disabled={loading}
            />
          </>
        )}
        {error && step !== 4 && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

function WizardNav({
  back,
  next,
  nextLabel = 'Continue',
  disabled = false,
}: {
  back: () => void;
  next: () => void;
  nextLabel?: string;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <div className="wizard-nav">
      <button className="button-secondary" type="button" onClick={back}>
        Back
      </button>
      <button className="button" type="button" onClick={next} disabled={disabled}>
        {nextLabel}
      </button>
    </div>
  );
}
