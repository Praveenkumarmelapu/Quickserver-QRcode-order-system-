import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as required by Next.js 15
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
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
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('GET order error:', error);
    return NextResponse.json({ error: 'Failed to retrieve order' }, { status: 500 });
  }
}
