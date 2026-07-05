import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch all available tables from the database to populate the mock QR simulator
  const tables = await prisma.table.findMany({
    orderBy: { tableNumber: 'asc' },
  }).catch(() => []);

  const firstTable = tables.find(t => t.tableNumber === 1) || tables[0];
  const exploreMenuUrl = firstTable 
    ? `/menu?table=${firstTable.tableNumber}&token=${firstTable.qrToken}`
    : `/menu?table=1&token=t1-secure-token-93f21`;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans flex flex-col justify-between">
      {/* Decorative background layers */}
      <div className="fixed inset-0 z-0 bg-soft-pattern"></div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-surface/20 via-transparent to-surface-container/30"></div>

      {/* Main Container */}
      <main className="relative z-10 max-w-5xl mx-auto w-full px-4 pt-16 pb-20 flex-1 flex flex-col items-center justify-center space-y-12">
        {/* Header Hero Area */}
        <header className="text-center space-y-4 max-w-xl mx-auto animate-float">
          <div className="w-20 h-20 bg-primary-container text-on-primary-container rounded-3xl flex items-center justify-center shadow-lg transform rotate-3 mx-auto">
            <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-none">
            LuxeDine <span className="text-primary-container">POS</span>
          </h1>
          <p className="text-base md:text-lg text-on-surface-variant leading-relaxed">
            A premium contactless, QR-based digital menu and kitchen order management system.
          </p>
        </header>

        {/* Seeding Warning Alert */}
        {tables.length === 0 && (
          <div className="w-full max-w-xl bg-amber-500/10 border border-amber-500/35 p-6 rounded-3xl text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-black text-on-surface uppercase tracking-wider">Database is Not Seeded!</h2>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                Before you can scan simulated QR codes or view staff dashboards, the restaurant tables, staff roles, and menus need to be seeded into your Postgres database.
              </p>
            </div>
            <a
              href="/api/admin/seed"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white hover:bg-opacity-95 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer decoration-none"
            >
              <span className="material-symbols-outlined text-[16px]">database</span>
              <span>1-Click Seed Demo Data</span>
            </a>
          </div>
        )}

        {/* Portals Split Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full">
          {/* Customer QR Simulator - Left side (takes 7 columns on desktop) */}
          <section className="md:col-span-8 bg-surface-container-lowest/80 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-outline-variant/30 shadow-sm space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
                <h2 className="text-xl font-bold tracking-tight text-on-surface">Customer Table Simulator</h2>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Scan simulation: Click any table below to simulate scanning its unique table QR code and launch the customer welcome page.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tables.map((table) => (
                <Link
                  key={table.id}
                  href={`/landing?table=${table.tableNumber}&token=${table.qrToken}`}
                  className="p-4 bg-surface-container-low hover:bg-primary-container hover:text-white border border-outline-variant/40 rounded-2xl text-center transition-all duration-200 group active:scale-95 cursor-pointer flex flex-col justify-between h-28 shadow-sm hover:shadow"
                >
                  <div className="text-xs uppercase tracking-wider font-extrabold opacity-75 group-hover:text-white text-on-surface-variant">
                    Table
                  </div>
                  <div className="text-2xl font-black">{table.tableNumber}</div>
                  <div className="text-[10px] opacity-75 group-hover:text-white text-on-surface-variant flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">group</span>
                    <span>{table.capacity} Seats</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Staff Access Panels - Right side (takes 4 columns on desktop) */}
          <section className="md:col-span-4 flex flex-col gap-6">
            {/* Staff Header */}
            <div className="space-y-1 md:pl-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-on-surface-variant">Staff Access Portals</h2>
              <p className="text-[11px] text-on-surface-variant/80">Secure dashboards for managers and chefs</p>
            </div>

            {/* Kitchen Card */}
            <Link
              href="/kitchen"
              className="p-6 bg-surface-container-low hover:bg-surface-container hover:border-primary/30 border border-outline-variant/30 rounded-3xl transition-all duration-200 group active:scale-98 cursor-pointer flex items-start gap-4 shadow-sm"
            >
              <div className="w-12 h-12 bg-secondary-container/20 text-secondary rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                <span className="material-symbols-outlined text-[26px]">countertops</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-on-surface group-hover:text-primary transition-colors">Kitchen Dashboard</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Real-time chef screen to receive orders and manage food preparation status.
                </p>
              </div>
            </Link>

            {/* Admin Card */}
            <Link
              href="/admin/dashboard"
              className="p-6 bg-surface-container-low hover:bg-surface-container hover:border-primary/30 border border-outline-variant/30 rounded-3xl transition-all duration-200 group active:scale-98 cursor-pointer flex items-start gap-4 shadow-sm"
            >
              <div className="w-12 h-12 bg-primary-container/10 text-primary-container rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                <span className="material-symbols-outlined text-[26px]">shield_person</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-on-surface group-hover:text-primary transition-colors">Admin Dashboard</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Manage menu edits, view active tables, check revenue reports, and reset security tokens.
                </p>
              </div>
            </Link>

            {/* General Menu Preview Card */}
            <Link
              href={exploreMenuUrl}
              className="p-6 bg-surface-container-lowest border border-outline-variant/20 rounded-3xl transition-all hover:bg-surface-container-low flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[22px]">menu_book</span>
                <span className="text-xs font-bold text-on-surface">Explore Menu Preview</span>
              </div>
              <span className="material-symbols-outlined text-outline-variant text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>

            {/* Staff Credentials Info Box */}
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl p-5 space-y-2.5 text-xs text-on-surface-variant leading-relaxed">
              <div className="flex items-center gap-1.5 text-on-surface font-bold">
                <span className="material-symbols-outlined text-[16px] text-primary">key</span>
                <span>Demo Staff Credentials</span>
              </div>
              <div className="space-y-1">
                <p><strong>Admin:</strong> admin@luxedine.com / <code className="bg-surface-container px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">admin123</code></p>
                <p><strong>Kitchen:</strong> kitchen@luxedine.com / <code className="bg-surface-container px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">kitchen123</code></p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto py-6 border-t border-outline-variant/15 text-center text-xs text-on-surface-variant opacity-60">
        LuxeDine POS © 2026 • Premium Smart Contactless Service
      </footer>
    </div>
  );
}
