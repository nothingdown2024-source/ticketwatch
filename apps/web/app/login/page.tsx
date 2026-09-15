import { AuthForm } from '@/components/auth-form';
import { Logo } from '@/components/logo';

export default function LoginPage(): React.ReactElement {
  return (
    <main className="auth-page">
      <Logo />
      <section>
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to your alerts</h1>
        <p>See what&apos;s being watched and whether tickets have appeared.</p>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
