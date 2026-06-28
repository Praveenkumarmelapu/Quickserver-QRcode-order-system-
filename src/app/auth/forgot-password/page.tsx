'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate reset request email delivery
    setTimeout(() => {
      setIsSubmitted(true);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center relative overflow-hidden py-12 px-4">
      {/* Ambient background blur */}
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-primary-container/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-tertiary-container/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10 space-y-8">
        {/* Branding Header */}
        <div className="flex flex-col items-center">
          <div className="mb-4 p-1 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20 transform -rotate-1">
            <img
              className="w-20 h-20 object-contain"
              alt="LuxeDine Logo"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5rv9N6cGYyadJH7xk9th4VBIYQSMH6A4ILpaZH3LrLDWNM0gDHI9l-dtZSP45yFHMsyrCAK7H0AIAZCGrKrWvercr-ZBKFYXZra2RgaS_4RP6gZ-VkmH0qryGro4rPZstSAT7iRqBGHU1Vh8mUs-5QHmrjuhISWx0dclhl0KCyf60ZgrFdTHBA56d0BXgWTOKv7BjSYUwCi4SRtH9EFBioXI5pLxsNFDokDjRq1_yZ16zyeJlxo7lGMY5iKTTsg5e9Iz12-on1fY"
            />
          </div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">LuxeDine</h1>
          <p className="text-xs font-bold text-on-surface-variant mt-1.5 tracking-widest uppercase">Staff Portal</p>
        </div>

        {/* Reset card */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-md space-y-6">
          <h2 className="text-xl font-bold text-on-surface text-center">Reset Password</h2>

          {isSubmitted ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[26px]">mark_email_read</span>
              </div>
              <p className="text-sm font-bold text-on-surface">Instructions Sent</p>
              <p className="text-xs text-on-surface-variant leading-relaxed max-w-[280px] mx-auto">
                We've sent recovery details to <strong className="text-on-surface">{email}</strong>. Please check your inbox or spam folder.
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="inline-block px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-md hover:bg-primary/95 active:scale-95 transition-all"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-on-surface-variant leading-relaxed text-center max-w-[280px] mx-auto">
                Enter your registered corporate email address and we'll send you link instructions to reset your account credentials.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1" htmlFor="email">
                  Corporate Email
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <span className="material-symbols-outlined text-[20px]">forward_to_inbox</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link href="/auth/login" className="text-xs text-on-surface-variant hover:text-on-surface transition-colors font-semibold">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      <footer className="mt-auto pt-8 text-center">
        <p className="text-[10px] text-on-surface-variant/40 font-medium">
          © 2026 LuxeDine Hospitality Systems • v2.5.0-stable
        </p>
      </footer>
    </div>
  );
}
