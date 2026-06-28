import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastLiveEvent } from '@/lib/sse-emitter';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED']),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const { status } = result.data;

    // Fetch order first to get its tableId
    const orderExists = await prisma.order.findUnique({
      where: { id },
      include: { table: true }
    });

    if (!orderExists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Execute updates inside a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status },
        include: {
          table: true,
          orderItems: {
            include: {
              menuItem: true
            }
          }
        }
      });

      // If status is COMPLETED, make the table AVAILABLE again
      if (status === 'COMPLETED') {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' }
        });
      }

      return order;
    });

    // Broadcast update via SSE
    broadcastLiveEvent('ORDER_STATUS_UPDATED', updatedOrder);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
