import { prisma } from '@/lib/prisma';
import MenuManagementClient from './menu-management-client';

export const dynamic = 'force-dynamic';

export default async function AdminMenuPage() {
  const [categories, menuItems] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.menuItem.findMany({
      where: { deleted: false },
      include: { category: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <MenuManagementClient
      initialCategories={categories}
      initialMenuItems={menuItems}
    />
  );
}
