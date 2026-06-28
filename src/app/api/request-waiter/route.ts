import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastLiveEvent } from '@/lib/sse-emitter';
import { z } from 'zod';

const requestSchema = z.object({
  tableId: z.string(),
  qrToken: z.string(),
  requestType: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    const { tableId, qrToken, requestType } = result.data;

    // Validate table
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (table.qrToken !== qrToken) {
      return NextResponse.json({ error: 'Invalid security token for table' }, { status: 403 });
    }

    // Map requestType to database type parameter
    let typeString = 'ASSISTANCE';
    if (requestType === 'Water') typeString = 'WATER';
    else if (requestType === 'Clean') typeString = 'CLEAN';
    else if (requestType === 'Support') typeString = 'SUPPORT';
    else if (requestType === 'Waiter') typeString = 'WAITER';

    // Create WaiterRequest
    const request = await prisma.waiterRequest.create({
      data: {
        tableId,
        type: typeString,
        resolved: false,
      },
    });

    const requestWithTable = {
      ...request,
      table,
    };

    // Broadcast update via SSE
    broadcastLiveEvent('ASSISTANCE_REQUEST', requestWithTable);

    return NextResponse.json(requestWithTable, { status: 201 });
  } catch (error) {
    console.error('Request waiter error:', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
export async function GET() {
  try {
    const requests = await prisma.waiterRequest.findMany({
      where: { resolved: false },
      include: { table: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error('GET assistance requests error:', error);
    return NextResponse.json({ error: 'Failed to retrieve requests' }, { status: 500 });
  }
}
export async function PATCH(req: Request) {
  // Resolve an assistance request (called by staff)
  try {
    const { id, resolved } = await req.json();
    const updated = await prisma.waiterRequest.update({
      where: { id },
      data: { resolved },
      include: { table: true }
    });

    broadcastLiveEvent('ASSISTANCE_RESOLVED', updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH assistance request error:', error);
    return NextResponse.json({ error: 'Failed to resolve request' }, { status: 500 });
  }
}
