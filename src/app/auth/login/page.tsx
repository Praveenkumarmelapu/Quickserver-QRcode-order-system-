'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if redirection was requested
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
      } else {
        // Authenticated successfully. Fetch session to find user role and redirect accordingly
        // For simplicity, redirecting to callbackUrl or admin dashboard first,
        // and middleware/page redirects will filter roles if needed.
        router.refresh();
        
        // Wait briefly for route synchronization
        setTimeout(() => {
          // If kitchen user, redirect to /kitchen
          if (email.toLowerCase().includes('kitchen')) {
            router.push('/kitchen');
          } else {
            router.push(callbackUrl);
          }
        }, 300);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md z-10 space-y-8 px-4">
      {/* Branding Header */}
      <div className="flex flex-col items-center">
        <div className="mb-4 p-1 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20 transform rotate-2">
          <img
            className="w-20 h-20 object-contain"
            alt="LuxeDine Logo"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5rv9N6cGYyadJH7xk9th4VBIYQSMH6A4ILpaZH3LrLDWNM0gDHI9l-dtZSP45yFHMsyrCAK7H0AIAZCGrKrWvercr-ZBKFYXZra2RgaS_4RP6gZ-VkmH0qryGro4rPZstSAT7iRqBGHU1Vh8mUs-5QHmrjuhISWx0dclhl0KCyf60ZgrFdTHBA56d0BXgWTOKv7BjSYUwCi4SRtH9EFBioXI5pLxsNFDokDjRq1_yZ16zyeJlxo7lGMY5iKTTsg5e9Iz12-on1fY"
          />
        </div>
        <h1 className="text-3xl font-extrabold text-primary tracking-tight">LuxeDine</h1>
        <p className="text-xs font-bold text-on-surface-variant mt-1.5 tracking-widest uppercase">Staff Portal</p>
      </div>

      {/* Login Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-md space-y-6">
        <h2 className="text-xl font-bold text-on-surface text-center">Sign In</h2>
        
        {error && (
          <div className="p-4 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2 border border-error/10">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1" htmlFor="email">
              Email Address
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[20px]">
                mail
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none placeholder:text-on-surface-variant/30"
                placeholder="name@luxedine.com"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1" htmlFor="password">
              Password
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[20px]">
                lock
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none placeholder:text-on-surface-variant/30"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Remember and Forgot password links */}
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <label className="flex items-center cursor-pointer group">
              <div className="relative flex items-center">
                <input type="checkbox" className="peer sr-only" />
                <div className="w-5 h-5 border border-outline-variant/60 rounded bg-surface peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-white opacity-0 peer-checked:opacity-100 font-bold select-none">
                    check
                  </span>
                </div>
              </div>
              <span className="ml-2 text-on-surface-variant group-hover:text-on-surface transition-colors font-medium">Remember me</span>
            </label>
            <Link href="/auth/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Login</span>
                <span className="material-symbols-outlined text-[20px]">login</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="text-center text-xs text-on-surface-variant/80 space-y-1">
        <p>Having trouble logging in?</p>
        <Link href="#" className="text-tertiary font-bold hover:underline">
          Contact System Administrator
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center relative overflow-hidden py-12">
      {/* Subtle Blurs */}
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-primary-container/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-secondary-container/10 rounded-full blur-3xl"></div>
      
      <Suspense fallback={
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
          <p className="text-sm text-on-surface-variant font-medium font-sans">Loading login...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>

      <footer className="mt-auto pt-8 text-center">
        <p className="text-[10px] text-on-surface-variant/40 font-medium">
          © 2026 LuxeDine Hospitality Systems • v2.5.0-stable
        </p>
      </footer>
    </div>
  );
}
