'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

export function AuthForm({ mode }: { mode: 'login' | 'register' }): React.ReactElement {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          ...(mode === 'register' ? { displayName: form.get('displayName') } : {}),
        }),
      });
      router.push('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {mode === 'register' && (
        <label>
          Display name
          <input name="displayName" autoComplete="name" minLength={2} required />
        </label>
      )}
      <label>
        Email address
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          minLength={12}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>
      <p className="auth-switch">
        {mode === 'login' ? (
          <>
            New to TicketWatch? <Link href="/register">Create an account</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login">Sign in</Link>
          </>
        )}
      </p>
    </form>
  );
}
