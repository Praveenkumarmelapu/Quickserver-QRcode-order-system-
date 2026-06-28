import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createMenuItemSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  isVeg: z.boolean().default(false),
  available: z.boolean().default(true),
  image: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const menuItems = await prisma.menuItem.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(menuItems);
  } catch (error) {
    console.error('Admin GET menu error:', error);
    return NextResponse.json({ error: 'Failed to retrieve menu items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = createMenuItemSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input data', details: result.error.format() }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: result.data,
      include: { category: true }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Admin POST menu error:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}
