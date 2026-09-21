'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { Brand } from '@/components/layout/brand';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/types/api';
import { UserRole } from '@/types/user';
import { Alert } from '@/components/ui/alert';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, isAuthenticated, isInitializing } = useAuth();

  const redirectUrl = searchParams.get('redirect') || '/home';

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirrors Supabase Auth's configured password policy — surfaced here so
  // a weak password is caught while typing instead of round-tripping to
  // the server only to fail with "Password should contain at least one
  // character of each: a-z, A-Z, 0-9, symbols."
  const passwordRequirements = [
    { met: password.length >= 8, label: '8+ characters' },
    { met: /[a-z]/.test(password), label: 'a lowercase letter' },
    { met: /[A-Z]/.test(password), label: 'an uppercase letter' },
    { met: /[0-9]/.test(password), label: 'a number' },
    { met: /[^A-Za-z0-9]/.test(password), label: 'a symbol' },
  ];
  const missingPasswordRequirements = passwordRequirements.filter((r) => !r.met).map((r) => r.label);
  const isPasswordValid = missingPasswordRequirements.length === 0;

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, isInitializing, router, redirectUrl]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (!isPasswordValid) {
      setError(`Password needs ${missingPasswordRequirements.join(', ')}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signup(
        {
          email: email.trim(),
          username: username.trim(),
          password,
          displayName: displayName.trim() || undefined,
          role,
        },
        redirectUrl
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.errors?.[0]?.message || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-surface p-6 sm:p-8 shadow-2xl">
      <Link href="/" aria-label="Musify home" className="mb-8 flex justify-center"><Brand /></Link>
      <h1 className="mb-2 text-center text-3xl font-bold text-neutral-50">Find your frequency.</h1>
      <p className="mb-7 text-center text-sm text-neutral-400">Make room for more music.</p>

      {error && (
        <div className="mb-4">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium text-neutral-400 mb-1">
            Email *
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="signup-username" className="block text-sm font-medium text-neutral-400 mb-1">
            Username *
          </label>
          <input
            id="signup-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Pick a unique username"
            disabled={isLoading}
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="signup-displayName" className="block text-sm font-medium text-neutral-400 mb-1">
            Display Name (Optional)
          </label>
          <input
            id="signup-displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your public name"
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium text-neutral-400 mb-1">
            Password *
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8+ chars, upper & lowercase, a number & symbol"
            disabled={isLoading}
            required
            aria-describedby="signup-password-hint"
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
          />
          {password.length > 0 && (
            <p
              id="signup-password-hint"
              className={`mt-1.5 text-xs ${isPasswordValid ? 'text-brand-400' : 'text-neutral-500'}`}
            >
              {isPasswordValid ? '✓ Strong enough' : `Still needs: ${missingPasswordRequirements.join(', ')}`}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-role" className="block text-sm font-medium text-neutral-400 mb-1">
            Account Role
          </label>
          <select
            id="signup-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
          >
            <option value="USER">Standard Listener (User)</option>
            <option value="ARTIST">Artist / Creator</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim() || !username.trim() || !password}
          className="w-full rounded-full bg-brand-400 py-3 text-sm font-semibold text-black hover:bg-brand-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-400">
        Already have an account?{' '}
        <Link
          href={`/login${redirectUrl !== '/home' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
          className="font-semibold text-white underline hover:text-neutral-200"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center auth-backdrop px-4 py-10 text-neutral-50">
      <Suspense fallback={<div className="text-neutral-500 text-sm">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
