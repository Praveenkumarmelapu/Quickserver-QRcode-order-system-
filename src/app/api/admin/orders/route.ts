import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        table: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Admin GET orders error:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}
