import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminSidebar from './admin-sidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Route guard: Redirect non-admins
  if (!session || (session.user as any).role !== 'ADMIN') {
    redirect('/auth/login?callbackUrl=/admin/dashboard');
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex overflow-hidden">
      {/* Sidebar Navigation */}
      <AdminSidebar user={session.user} />
      
      {/* Main Panel Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto no-scrollbar relative">
        {children}
      </div>
    </div>
  );
}
