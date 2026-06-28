import { prisma } from '@/lib/prisma';
import LandingClient from './landing-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ table?: string; token?: string }>;
}

export default async function LandingPage({ searchParams }: PageProps) {
  const { table: tableNumberStr, token } = await searchParams;

  if (!tableNumberStr || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="bg-surface-container-lowest border border-error/20 p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-error-container text-error rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Invalid QR Code</h1>
          <p className="text-on-surface-variant text-base leading-relaxed">
            We couldn't detect a table number or security token in your link. Please check and scan the QR code printed on your restaurant table again.
          </p>
        </div>
      </div>
    );
  }

  const tableNumber = parseInt(tableNumberStr, 10);
  if (isNaN(tableNumber)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="bg-surface-container-lowest border border-error/20 p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-error-container text-error rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]">error</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Invalid Table Number</h1>
          <p className="text-on-surface-variant text-base leading-relaxed">
            The table number provided in the QR link is not valid. Please ask a waiter for assistance or scan the QR code again.
          </p>
        </div>
      </div>
    );
  }

  const table = await prisma.table.findUnique({
    where: { tableNumber },
  });

  if (!table || table.qrToken !== token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="bg-surface-container-lowest border border-error/20 p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-error-container text-error rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_bad</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Access Denied</h1>
          <p className="text-on-surface-variant text-base leading-relaxed">
            Security check failed. The QR code scanned is invalid or has expired. Please scan the official QR code at your table or ask staff for help.
          </p>
        </div>
      </div>
    );
  }

  return <LandingClient table={table} />;
}
