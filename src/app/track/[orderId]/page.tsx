import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import TrackClient from './track-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderTrackingPage({ params }: PageProps) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      orderItems: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <TrackClient initialOrder={order} />
  );
}
