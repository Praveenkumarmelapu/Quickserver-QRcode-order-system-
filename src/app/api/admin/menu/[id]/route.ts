import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';

const updateMenuItemSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  isVeg: z.boolean().optional(),
  available: z.boolean().optional(),
  image: z.string().optional().nullable(),
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
    const result = updateMenuItemSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input data', details: result.error.format() }, { status: 400 });
    }

    const itemExists = await prisma.menuItem.findUnique({ where: { id } });
    if (!itemExists) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: result.data,
      include: { category: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin PUT menu item error:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
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

    const itemExists = await prisma.menuItem.findUnique({ where: { id } });
    if (!itemExists) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    await prisma.menuItem.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    console.error('Admin DELETE menu item error:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}
