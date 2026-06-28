'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function AdminSidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
    { name: 'Menu Editor', path: '/admin/menu', icon: 'restaurant_menu' },
    { name: 'Table QR Manager', path: '/admin/tables', icon: 'qr_code_2' },
    { name: 'Kitchen View', path: '/kitchen', icon: 'soup_kitchen' },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <>
      {/* Mobile AppBar header */}
      <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-surface-container-low border-b border-outline-variant/20 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            restaurant
          </span>
          <span className="text-lg font-bold text-primary">LuxeDine Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
        </button>
      </header>

      {/* Drawer Overlay for Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        ></div>
      )}

      {/* Sidebar Navigation Panel */}
      <aside className={`fixed md:relative top-0 bottom-0 left-0 w-64 bg-surface-container-low dark:bg-inverse-surface border-r border-outline-variant/30 flex flex-col py-6 z-50 transition-transform duration-300 md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } shrink-0 h-screen`}>
        {/* Branding header */}
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[30px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant
            </span>
            <span className="text-xl font-extrabold text-primary tracking-tight">LuxeDine</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="mx-4 mb-6 p-3 bg-surface-container-lowest/80 border border-outline-variant/40 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-extrabold flex items-center justify-center shadow-inner">
            {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">{user?.name || 'Administrator'}</p>
            <p className="text-[9px] text-on-surface-variant font-medium uppercase tracking-wider">Store Manager</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-6 py-3 mx-2 rounded-xl transition-all font-semibold text-xs uppercase tracking-wider cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="mt-auto px-4 space-y-4">
          <button
            onClick={handleLogout}
            className="w-full h-11 bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-error-container hover:text-on-error-container rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Logout Portal</span>
          </button>
          
          <p className="text-center text-[9px] text-on-surface-variant/40 font-medium">
            LuxeDine Admin Panel • v2.5.0
          </p>
        </div>
      </aside>
    </>
  );
}
