import { prisma } from '@/lib/prisma';
import DashboardClient from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // 1. Fetch initial statistics
  const [orders, tables, unresolvedRequests] = await Promise.all([
    prisma.order.findMany({
      include: {
        table: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.table.findMany(),
    prisma.waiterRequest.findMany({
      where: { resolved: false },
      include: { table: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return (
    <DashboardClient
      initialOrders={orders}
      initialTables={tables}
      initialRequests={unresolvedRequests}
    />
  );
}
