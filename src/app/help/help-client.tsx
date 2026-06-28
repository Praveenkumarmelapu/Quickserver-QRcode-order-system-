'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/lib/store';

export default function HelpClient() {
  const router = useRouter();
  const tableSession = useOrderStore((state) => state.tableSession);
  const activeOrderId = useOrderStore((state) => state.activeOrderId);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('Assistance requested!');

  const handleRequest = async (type: 'Waiter' | 'Water' | 'Clean' | 'Bill' | 'Support') => {
    if (!tableSession) {
      alert('No active table session. Please scan a table QR code to request staff assistance.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const endpoint = type === 'Bill' ? '/api/request-bill' : '/api/request-waiter';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: tableSession.id,
          qrToken: tableSession.qrToken,
          requestType: type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      setToastMessage(
        type === 'Bill' 
          ? 'Bill requested! Waiter will bring the check shortly.'
          : type === 'Clean'
          ? 'Table cleaning requested! Staff will clean the table shortly.'
          : 'Assistance requested! A staff member will be with you shortly.'
      );
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMenuUrl = () => {
    if (tableSession) {
      return `/menu?table=${tableSession.tableNumber}&token=${tableSession.qrToken}`;
    }
    return '/menu';
  };

  const getTrackUrl = () => {
    if (activeOrderId) {
      return `/track/${activeOrderId}`;
    }
    return '#';
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans pb-24">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface shadow-sm flex justify-between items-center px-4 h-16 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container overflow-hidden">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant
            </span>
          </div>
          <span className="font-sans text-xl text-primary font-bold">LuxeDine</span>
        </div>
        <button 
          onClick={() => {
            if (tableSession) router.push(getMenuUrl());
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95 duration-150"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-20 px-4 max-w-lg mx-auto w-full flex flex-col justify-between">
        <div>
          <div className="mb-6 mt-4">
            <h1 className="text-2xl font-black text-on-surface tracking-tight mb-1">Need something?</h1>
            <p className="text-xs text-on-surface-variant font-medium">
              {tableSession 
                ? `You are at Table ${tableSession.tableNumber}. Tap a card below and our staff will be right with you.`
                : 'Select an assistance option below to summon help.'}
            </p>
          </div>

          {/* Assistance Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Call Waiter Card */}
            <button 
              disabled={isSubmitting}
              onClick={() => handleRequest('Waiter')}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-[0.97] hover:-translate-y-0.5 text-center group cursor-pointer disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-full bg-primary-container/15 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                <span className="material-symbols-outlined text-primary group-hover:text-white text-3xl">person_raised_hand</span>
              </div>
              <span className="font-bold text-sm text-on-surface">Call Waiter</span>
            </button>

            {/* Request Water Card */}
            <button 
              disabled={isSubmitting}
              onClick={() => handleRequest('Water')}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-[0.97] hover:-translate-y-0.5 text-center group cursor-pointer disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-full bg-tertiary-container/20 flex items-center justify-center group-hover:bg-tertiary transition-colors duration-300">
                <span className="material-symbols-outlined text-tertiary group-hover:text-white text-3xl">water_full</span>
              </div>
              <span className="font-bold text-sm text-on-surface">Request Water</span>
            </button>

            {/* Request Bill Card */}
            <button 
              disabled={isSubmitting}
              onClick={() => handleRequest('Bill')}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-[0.97] hover:-translate-y-0.5 text-center group cursor-pointer disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center group-hover:bg-secondary transition-colors duration-300">
                <span className="material-symbols-outlined text-secondary group-hover:text-on-secondary-fixed-variant text-3xl">receipt_long</span>
              </div>
              <span className="font-bold text-sm text-on-surface">Request Bill</span>
            </button>

            {/* Need Help Card */}
            <button 
              disabled={isSubmitting}
              onClick={() => handleRequest('Support')}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-[0.97] hover:-translate-y-0.5 text-center group cursor-pointer disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-full bg-inverse-surface/5 flex items-center justify-center group-hover:bg-inverse-surface transition-colors duration-300">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-inverse-on-surface text-3xl">support_agent</span>
              </div>
              <span className="font-bold text-sm text-on-surface">Need Help</span>
            </button>

            {/* Clean Table Card */}
            <button 
              disabled={isSubmitting}
              onClick={() => handleRequest('Clean')}
              className="col-span-2 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-4 flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-[0.97] hover:-translate-y-0.5 group cursor-pointer disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-full bg-primary-container/15 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                <span className="material-symbols-outlined text-primary group-hover:text-white text-[22px]">cleaning_services</span>
              </div>
              <span className="font-bold text-xs text-on-surface">Request Table Cleaning</span>
            </button>
          </div>
        </div>

        {/* Decorative Illustration Area */}
        <div className="mt-8 opacity-65 mb-6">
          <div className="h-44 w-full rounded-2xl overflow-hidden relative border border-outline-variant/30 shadow-inner">
            <img 
              alt="Atmospheric Restaurant Background" 
              className="w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
          </div>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center h-20 px-2 pb-2 bg-surface-container rounded-t-xl shadow-lg border-t border-outline-variant/30">
        <Link 
          href={getMenuUrl()}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high px-4 py-1 rounded-full transition-all active:scale-90"
        >
          <span className="material-symbols-outlined">restaurant_menu</span>
          <span className="text-[10px] font-bold mt-0.5">Menu</span>
        </Link>
        <Link 
          href="/cart"
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high px-4 py-1 rounded-full transition-all active:scale-90"
        >
          <span className="material-symbols-outlined">shopping_cart</span>
          <span className="text-[10px] font-bold mt-0.5">Cart</span>
        </Link>
        <Link 
          href={getTrackUrl()}
          className={`flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high px-4 py-1 rounded-full transition-all active:scale-90 ${
            !activeOrderId ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <span className="material-symbols-outlined">receipt_long</span>
          <span className="text-[10px] font-bold mt-0.5">Orders</span>
        </Link>
        <div 
          className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1.5 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
          <span className="text-[10px] font-bold mt-0.5">Help</span>
        </div>
      </nav>

      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm transition-all duration-300">
          <div className="bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary-fixed text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <div>
              <p className="font-bold text-xs text-white">Request Sent</p>
              <p className="text-[10px] opacity-85 text-white/90">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
