'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/types/api';
import { UserRole } from '@/types/user';

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

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, isInitializing, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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
        setError(err.message);
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
    <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Sign up for MUSIFY</h2>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-950/80 border border-red-800 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Username *
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Pick a unique username"
            disabled={isLoading}
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Display Name (Optional)
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your public name"
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Password *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            disabled={isLoading}
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Account Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isLoading}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
          >
            <option value="USER">Standard Listener (User)</option>
            <option value="ARTIST">Artist / Creator</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim() || !username.trim() || !password}
          className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      <Suspense fallback={<div className="text-neutral-500 text-sm">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
