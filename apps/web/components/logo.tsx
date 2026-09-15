import Link from 'next/link';

export function Logo(): React.ReactElement {
  return (
    <Link className="logo" href="/" aria-label="TicketWatch home">
      <span aria-hidden="true" className="logo-mark">
        T
      </span>
      <span>TicketWatch</span>
    </Link>
  );
}
