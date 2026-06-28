import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { broadcastLiveEvent } from '@/lib/sse-emitter';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !['ADMIN', 'STAFF'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const targetStatus = body.status || 'AVAILABLE'; // e.g. AVAILABLE or DIRTY

    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Process table billing completion in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve all active waiter requests for this table
      await tx.waiterRequest.updateMany({
        where: { tableId: id, resolved: false },
        data: { resolved: true }
      });

      // 2. Mark all active orders for this table as COMPLETED
      await tx.order.updateMany({
        where: { tableId: id, status: { not: 'COMPLETED' } },
        data: { status: 'COMPLETED' }
      });

      // 3. Set the table status to the target status
      const updatedTable = await tx.table.update({
        where: { id },
        data: { status: targetStatus }
      });

      return updatedTable;
    });

    // Broadcast the update so dashboards receive it
    broadcastLiveEvent('TABLE_BILLING_COMPLETED', result);

    return NextResponse.json({ success: true, table: result });
  } catch (error) {
    console.error('Complete table billing error:', error);
    return NextResponse.json({ error: 'Failed to complete table billing' }, { status: 500 });
  }
}
