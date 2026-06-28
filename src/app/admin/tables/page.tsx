import { prisma } from '@/lib/prisma';
import TablesManagementClient from './tables-management-client';

export const dynamic = 'force-dynamic';

export default async function AdminTablesPage() {
  const tables = await prisma.table.findMany({
    orderBy: { tableNumber: 'asc' },
  });

  return (
    <TablesManagementClient initialTables={tables} />
  );
}
