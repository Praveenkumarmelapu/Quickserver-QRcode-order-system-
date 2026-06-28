import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KitchenClient from './kitchen-client';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
  const session = await auth();

  if (!session || ((session.user as any).role !== 'KITCHEN' && (session.user as any).role !== 'ADMIN')) {
    redirect('/auth/login?callbackUrl=/kitchen');
  }

  // Fetch initial active orders
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED']
      }
    },
    include: {
      table: true,
      orderItems: {
        include: {
          menuItem: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc' // Kitchen wants oldest orders first
    }
  });

  return (
    <KitchenClient initialOrders={orders} user={session.user} />
  );
}
