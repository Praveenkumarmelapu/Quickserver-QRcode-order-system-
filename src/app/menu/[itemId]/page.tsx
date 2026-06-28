import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ItemDetailsClient from './item-details-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ itemId: string }>;
}

export default async function ItemDetailsPage({ params }: PageProps) {
  const { itemId } = await params;

  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: { category: true }
  });

  if (!item) {
    notFound();
  }

  return (
    <ItemDetailsClient item={item} />
  );
}
