import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function Home(): React.ReactElement {
  return (
    <main>
      <header className="marketing-header">
        <Logo />
        <nav aria-label="Account">
          <Link href="/login">Sign in</Link>
          <Link className="button button-small" href="/register">
            Create alert
          </Link>
        </nav>
      </header>
      <section className="hero">
        <p className="eyebrow">Movie ticket availability, monitored</p>
        <h1>
          Stop refreshing.
          <br />
          <span>Know when tickets open.</span>
        </h1>
        <p className="hero-copy">
          Track the movies you&apos;re waiting for and get notified the moment ticket availability
          appears.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/register">
            Create ticket alert
          </Link>
          <Link className="text-link" href="/login">
            I already have an account <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="promise-row" aria-label="Product promises">
          <span>
            <i aria-hidden="true">✓</i> One shared source check
          </span>
          <span>
            <i aria-hidden="true">✓</i> No repeated notifications
          </span>
          <span>
            <i aria-hidden="true">✓</i> Official booking links
          </span>
        </div>
      </section>
      <section className="how-it-works" aria-labelledby="how-title">
        <div>
          <p className="eyebrow">Simple by design</p>
          <h2 id="how-title">
            You wait for the movie.
            <br />
            We watch the page.
          </h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Add the cinema page</h3>
              <p>
                Paste a supported, public ticket page. We securely identify the source and movies.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Choose what to watch</h3>
              <p>Select a detected movie or add a precise title and aliases.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Get the signal</h3>
              <p>When availability opens, receive one alert with the official booking URL.</p>
            </div>
          </li>
        </ol>
      </section>
    </main>
  );
}
