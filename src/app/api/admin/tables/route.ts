import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const createTableSchema = z.object({
  tableNumber: z.number().int().positive(),
  capacity: z.number().int().positive(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'BILLING', 'DIRTY']).default('AVAILABLE'),
});

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tables = await prisma.table.findMany({
      orderBy: { tableNumber: 'asc' },
    });
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Admin GET tables error:', error);
    return NextResponse.json({ error: 'Failed to retrieve tables' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = createTableSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input data', details: result.error.format() }, { status: 400 });
    }

    const { tableNumber, capacity, status } = result.data;

    // Check if tableNumber is unique
    const tableExists = await prisma.table.findUnique({
      where: { tableNumber },
    });

    if (tableExists) {
      return NextResponse.json({ error: `Table number ${tableNumber} already exists` }, { status: 400 });
    }

    // Generate unique secure qrToken
    const qrToken = `t${tableNumber}-token-${crypto.randomBytes(4).toString('hex')}`;

    const newTable = await prisma.table.create({
      data: {
        tableNumber,
        capacity,
        status,
        qrToken,
      },
    });

    return NextResponse.json(newTable, { status: 201 });
  } catch (error) {
    console.error('Admin POST table error:', error);
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
  }
}
