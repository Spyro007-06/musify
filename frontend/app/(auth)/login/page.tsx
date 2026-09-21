'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { Brand } from '@/components/layout/brand';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/types/api';
import { Alert } from '@/components/ui/alert';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isInitializing } = useAuth();

  const redirectUrl = searchParams.get('redirect') || '/home';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!identifier.trim() || !password) {
      setError('Please enter your email/username and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isEmail = identifier.includes('@');
      await login(
        {
          email: isEmail ? identifier.trim() : undefined,
          username: !isEmail ? identifier.trim() : undefined,
          password,
        },
        redirectUrl
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.errors?.[0]?.message || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-surface p-6 sm:p-8 shadow-2xl">
      <Link href="/" aria-label="Musify home" className="mb-8 flex justify-center"><Brand /></Link>
      <h1 className="mb-2 text-center text-3xl font-bold text-neutral-50">Welcome back.</h1>
      <p className="mb-7 text-center text-sm text-neutral-400">Your next favorite track is waiting.</p>

      {error && (
        <div className="mb-4">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-identifier" className="block text-sm font-medium text-neutral-400 mb-1">
            Email or Username
          </label>
          <input
            id="login-identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your email or username"
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-neutral-400 mb-1">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !identifier.trim() || !password}
          className="w-full rounded-full bg-brand-400 py-3 text-sm font-semibold text-black hover:bg-brand-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-400">
        Don&apos;t have an account?{' '}
        <Link
          href={`/signup${redirectUrl !== '/home' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
          className="font-semibold text-white underline hover:text-neutral-200"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center auth-backdrop px-4 py-10 text-neutral-50">
      <Suspense fallback={<div className="text-neutral-500 text-sm">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
