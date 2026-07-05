import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastLiveEvent } from '@/lib/sse-emitter';
import { z } from 'zod';

const orderItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().positive(),
  notes: z.string().optional().nullable(),
  price: z.number().positive(),
});

const createOrderSchema = z.object({
  tableId: z.string(),
  qrToken: z.string(),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = createOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid order input data', details: result.error.format() }, { status: 400 });
    }

    const { tableId, qrToken, items, subtotal, tax, total } = result.data;

    // Validate table security token
    const table = await prisma.table.findUnique({
      where: { id: tableId }
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (table.qrToken !== qrToken) {
      return NextResponse.json({ error: 'Invalid security token for this table. Please re-scan the QR code.' }, { status: 403 });
    }

    // Execute order creation and table status update in a transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const order = await tx.order.create({
        data: {
          tableId,
          status: 'PENDING',
          subtotal,
          tax,
          total,
          orderItems: {
            create: items.map(item => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              notes: item.notes,
              price: item.price,
            }))
          }
        },
        include: {
          table: true,
          orderItems: {
            include: {
              menuItem: true
            }
          }
        }
      });

      // 2. Mark table status as PREPARING
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'PREPARING' }
      });

      return order;
    });

    // Broadcast the new order event to kitchen & admin in real-time
    broadcastLiveEvent('NEW_ORDER', newOrder);

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Internal server error while placing order' }, { status: 500 });
  }
}
export async function GET(req: Request) {
  // Return all orders (for admin/kitchen list, optionally filtered by table or active status)
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get('tableId');
    const active = searchParams.get('active');

    const where: any = {};
    if (tableId) {
      where.tableId = tableId;
    }
    if (active === 'true') {
      where.status = {
        notIn: ['COMPLETED']
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        orderItems: {
          include: {
            menuItem: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('List orders error:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}
