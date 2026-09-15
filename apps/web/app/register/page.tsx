import { AuthForm } from '@/components/auth-form';
import { Logo } from '@/components/logo';

export default function RegisterPage(): React.ReactElement {
  return (
    <main className="auth-page">
      <Logo />
      <section>
        <p className="eyebrow">Start watching</p>
        <h1>Create your account</h1>
        <p>Your first demo alert takes less than a minute.</p>
        <AuthForm mode="register" />
      </section>
    </main>
  );
}
