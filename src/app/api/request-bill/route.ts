import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastLiveEvent } from '@/lib/sse-emitter';
import { z } from 'zod';

const requestSchema = z.object({
  tableId: z.string(),
  qrToken: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    const { tableId, qrToken } = result.data;

    // Validate table
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (table.qrToken !== qrToken) {
      return NextResponse.json({ error: 'Invalid security token for table' }, { status: 403 });
    }

    // Process in a transaction
    const requestWithTable = await prisma.$transaction(async (tx) => {
      // 1. Create WaiterRequest
      const request = await tx.waiterRequest.create({
        data: {
          tableId,
          type: 'BILL',
          resolved: false,
        },
      });

      // 2. Update Table status to BILLING
      const updatedTable = await tx.table.update({
        where: { id: tableId },
        data: { status: 'BILLING' }
      });

      return {
        ...request,
        table: updatedTable,
      };
    });

    // Broadcast update via SSE
    broadcastLiveEvent('BILL_REQUEST', requestWithTable);

    return NextResponse.json(requestWithTable, { status: 201 });
  } catch (error) {
    console.error('Request bill error:', error);
    return NextResponse.json({ error: 'Failed to submit billing request' }, { status: 500 });
  }
}
