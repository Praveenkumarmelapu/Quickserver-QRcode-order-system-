import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to ensure fresh database query
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const menu = await prisma.category.findMany({
      include: {
        items: {
          where: { deleted: false },
          orderBy: {
            name: 'asc'
          }
        },
      },
      orderBy: {
        name: 'asc'
      }
    });
    return NextResponse.json(menu);
  } catch (error) {
    console.error('API menu error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}
