import { prisma } from '@/lib/prisma';
import MenuClient from './menu-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ table?: string; token?: string }>;
}

export default async function MenuPage({ searchParams }: PageProps) {
  const { table: tableNumberStr, token } = await searchParams;
  let verifiedTable = null;

  if (tableNumberStr && token) {
    const tableNumber = parseInt(tableNumberStr, 10);
    if (!isNaN(tableNumber)) {
      const table = await prisma.table.findUnique({
        where: { tableNumber },
      });
      if (table && table.qrToken === token) {
        verifiedTable = {
          id: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          qrToken: table.qrToken,
        };
      }
    }
  }

  // Fetch all categories along with their menu items
  const categories = await prisma.category.findMany({
    include: {
      items: {
        where: { available: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Find the seared scallops for today's special banner (or default to first item if not found)
  const specialItem = await prisma.menuItem.findFirst({
    where: { name: { contains: 'Scallops' } }
  }) || (categories[0]?.items[0] || null);

  return (
    <MenuClient 
      initialCategories={categories} 
      specialItem={specialItem} 
      verifiedTable={verifiedTable}
    />
  );
}
