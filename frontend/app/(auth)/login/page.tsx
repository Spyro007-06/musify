'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/types/api';

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
        setError(err.message);
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
    <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Log in to MUSIFY</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-950/80 border border-red-800 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Email or Username
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your email or username"
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !identifier.trim() || !password}
          className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      <Suspense fallback={<div className="text-neutral-500 text-sm">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
