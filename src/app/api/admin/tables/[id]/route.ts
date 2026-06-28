import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import crypto from 'crypto';

const updateTableSchema = z.object({
  tableNumber: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'BILLING', 'DIRTY']).optional(),
  regenerateToken: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const result = updateTableSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input data', details: result.error.format() }, { status: 400 });
    }

    const { tableNumber, capacity, status, regenerateToken } = result.data;

    // Check if table exists
    const tableExists = await prisma.table.findUnique({ where: { id } });
    if (!tableExists) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Check if new table number is unique
    if (tableNumber && tableNumber !== tableExists.tableNumber) {
      const numberExists = await prisma.table.findUnique({ where: { tableNumber } });
      if (numberExists) {
        return NextResponse.json({ error: `Table number ${tableNumber} is already taken` }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (tableNumber !== undefined) updateData.tableNumber = tableNumber;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (status !== undefined) updateData.status = status;
    
    if (regenerateToken) {
      const num = tableNumber !== undefined ? tableNumber : tableExists.tableNumber;
      updateData.qrToken = `t${num}-token-${crypto.randomBytes(4).toString('hex')}`;
    }

    const updated = await prisma.table.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin PUT table error:', error);
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const tableExists = await prisma.table.findUnique({ where: { id } });
    if (!tableExists) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Delete table (restrict if has orders, or delete cascade. Our schema maps table.orders relation as Restrict)
    // Check if table has active orders first to avoid Prisma throwing foreign key constraint error
    const activeOrders = await prisma.order.findFirst({
      where: { tableId: id }
    });

    if (activeOrders) {
      return NextResponse.json({ error: 'Cannot delete table. This table has associated order history.' }, { status: 400 });
    }

    await prisma.table.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Admin DELETE table error:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}
