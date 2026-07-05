'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/lib/store';

interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  qrToken: string;
  status: string;
}

export default function LandingClient({ table }: { table: Table }) {
  const setTableSession = useOrderStore((state) => state.setTableSession);
  const setActiveOrderId = useOrderStore((state) => state.setActiveOrderId);
  const router = useRouter();
  const [animatingOut, setAnimatingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Save table session on load
    setTableSession({
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      qrToken: table.qrToken,
    });

    // If the table status is AVAILABLE, clear previous session order memory to prevent leakage to next scan
    if (table.status === 'AVAILABLE') {
      setActiveOrderId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('luxedine-placed-orders');
      }
    }

    // Trigger staggered animations after mount
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, [table, setTableSession, setActiveOrderId]);

  const handleContinue = () => {
    setAnimatingOut(true);
    setTimeout(() => {
      router.push(`/menu?table=${table.tableNumber}&token=${table.qrToken}`);
    }, 400);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-hidden bg-background transition-all duration-500 ${animatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      {/* Dot Pattern Background Layer */}
      <div className="fixed inset-0 z-0 bg-soft-pattern"></div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-surface/20 via-transparent to-surface-container/40"></div>

      {/* Floating Ambient Particles */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-20 left-[15%] w-3 h-3 rounded-full bg-primary-container/40 animate-float-particle" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-32 left-[45%] w-2 h-2 rounded-full bg-secondary-container/50 animate-float-particle" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-16 right-[20%] w-4 h-4 rounded-full bg-tertiary-container/30 animate-float-particle" style={{ animationDelay: '3s' }}></div>
        <div className="absolute bottom-40 right-[35%] w-2.5 h-2.5 rounded-full bg-primary-fixed-dim/30 animate-float-particle" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-between px-4 pt-10 pb-10 w-full max-w-md mx-auto min-h-screen">
        {/* Brand Identity Section - Animated Entry */}
        <header className="w-full flex flex-col items-center space-y-4 mt-4">
          {/* Logo with scale bounce animation */}
          <div 
            className={`opacity-0 ${mounted ? 'animate-scale-in' : ''}`}
          >
            <div className="w-20 h-20 bg-primary-container rounded-2xl flex items-center justify-center shadow-lg animate-pulse-glow">
              <span className="material-symbols-outlined text-on-primary-container text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                restaurant
              </span>
            </div>
          </div>

          {/* Brand name fade down */}
          <div className={`opacity-0 ${mounted ? 'animate-fade-slide-down delay-200' : ''}`}>
            <h1 className="font-sans text-xl text-primary font-bold tracking-tight">
              LuxeDine
            </h1>
          </div>
        </header>

        {/* Welcome Message Section - Staggered Entry */}
        <section className="w-full space-y-6 text-center flex flex-col items-center my-auto py-6">
          {/* Glass Card with slide up */}
          <div className={`w-full opacity-0 ${mounted ? 'animate-fade-slide-up delay-300' : ''}`}>
            <div className="w-full glass-card p-6 md:p-8 rounded-3xl shadow-sm space-y-4 relative overflow-hidden">
              {/* Shimmer overlay on card */}
              <div className="absolute inset-0 animate-shimmer rounded-3xl pointer-events-none"></div>

              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-secondary-container text-on-secondary-container rounded-full mb-1">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    table_restaurant
                  </span>
                  <span className="font-semibold text-xs tracking-wide uppercase">Table {table.tableNumber}</span>
                </div>
                <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
                  Welcome to <span className="text-primary">Table {table.tableNumber}</span>
                </h2>
                <p className="text-sm md:text-base text-on-surface-variant max-w-[280px] mx-auto leading-relaxed">
                  Ready to discover something delicious? Tap below to explore our menu and order directly from your table.
                </p>
              </div>
            </div>
          </div>

          {/* Visual Decorative Element with slide up */}
          <div className={`relative w-full h-48 mt-4 opacity-0 ${mounted ? 'animate-fade-slide-up delay-500' : ''}`}>
            <div className="absolute inset-0 flex justify-center items-center">
              <div className="w-64 h-64 bg-primary-fixed-dim/20 rounded-full blur-3xl animate-pulse"></div>
            </div>
            <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden shadow-xl border-4 border-surface-container-lowest">
              <img
                className="w-full h-full object-cover"
                alt="Gourmet appetizer presentation"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjktTutHxGEc8tlh-5Ra-utVLaTpECw1oPeLyGWePn-O5wQjIoHU-Z9COtS2lq_R3GAS3AZqffW8BMZ0dzI1a-Bnuhcwjvb1DRSHodMNc6_Z4X1LOgy1feKHpy-pjtrUOUSIv4xeKZIe1EvPYnR7pIucxgCrpf6nm0ZsTVEMNGRTHRF8Px5a9UVYlIDqyIM8FrOTRtYBqGB49TyMCXVFBCmx0VgrI4AMgeCWyDaZtUu0lxXPM9TrTBL066EUcSpBmY-KzL0qeE6Js"
              />
            </div>
          </div>

          {/* Feature highlights row */}
          <div className={`flex justify-center gap-6 text-center opacity-0 ${mounted ? 'animate-fade-slide-up delay-600' : ''}`}>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
              </div>
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Scan & Order</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>track_changes</span>
              </div>
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Live Tracking</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
              </div>
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Easy Pay</span>
            </div>
          </div>
        </section>

        {/* Primary Action Anchor - Animated Entry */}
        <footer className={`w-full pt-4 mt-auto opacity-0 ${mounted ? 'animate-fade-slide-up delay-700' : ''}`}>
          <button
            onClick={handleContinue}
            className="group relative w-full h-16 bg-primary-container text-on-primary-container rounded-xl shadow-lg active:scale-[0.97] hover:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-3 hover:bg-primary hover:text-white overflow-hidden cursor-pointer animate-pulse-glow"
          >
            {/* Button Shine Effect */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <span className="text-sm font-bold uppercase tracking-wider">Continue to Menu</span>
            <span className="material-symbols-outlined font-bold group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
          <p className="text-center mt-4 text-[10px] uppercase font-bold tracking-wider text-on-surface-variant opacity-60">
            LuxeDine © 2026 • Smart Table Service
          </p>
        </footer>
      </main>
    </div>
  );
}
