import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Create Staff Users
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const kitchenPasswordHash = bcrypt.hashSync('kitchen123', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@luxedine.com' },
      update: {},
      create: {
        name: 'LuxeDine Admin',
        email: 'admin@luxedine.com',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
      },
    });

    const kitchen = await prisma.user.upsert({
      where: { email: 'kitchen@luxedine.com' },
      update: {},
      create: {
        name: 'LuxeDine Kitchen',
        email: 'kitchen@luxedine.com',
        passwordHash: kitchenPasswordHash,
        role: 'KITCHEN',
      },
    });

    // 2. Create Tables
    const tablesData = [
      { tableNumber: 1, capacity: 2, qrToken: 't1-secure-token-93f21' },
      { tableNumber: 2, capacity: 2, qrToken: 't2-secure-token-42d81' },
      { tableNumber: 3, capacity: 4, qrToken: 't3-secure-token-11a54' },
      { tableNumber: 4, capacity: 4, qrToken: 't4-secure-token-82f50' },
      { tableNumber: 5, capacity: 6, qrToken: 't5-secure-token-33c94' },
      { tableNumber: 6, capacity: 2, qrToken: 't6-secure-token-55d78' },
      { tableNumber: 7, capacity: 4, qrToken: 't7-secure-token-19e42' },
      { tableNumber: 8, capacity: 4, qrToken: 't8-secure-token-76a0c' },
      { tableNumber: 9, capacity: 6, qrToken: 't9-secure-token-28b9d' },
      { tableNumber: 10, capacity: 8, qrToken: 't10-secure-token-44f2e' },
    ];

    for (const table of tablesData) {
      await prisma.table.upsert({
        where: { tableNumber: table.tableNumber },
        update: { qrToken: table.qrToken, capacity: table.capacity },
        create: table,
      });
    }

    // 3. Create Categories
    const categories = [
      { name: 'Starters' },
      { name: 'Main Course' },
      { name: 'Snacks' },
      { name: 'Desserts' },
      { name: 'Drinks' },
    ];

    const categoryMap: Record<string, string> = {};
    for (const cat of categories) {
      const created = await prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: cat,
      });
      categoryMap[cat.name] = created.id;
    }

    // 4. Create Menu Items
    const menuItems = [
      {
        categoryId: categoryMap['Starters'],
        name: 'Garden Medley Salad',
        description: 'Vibrant organic greens, cherry tomatoes, cucumbers, and shaved carrots served with fresh balsamic glaze.',
        price: 12.00,
        isVeg: true,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=60',
      },
      {
        categoryId: categoryMap['Starters'],
        name: 'Crispy Truffle Fries',
        description: 'Golden-cut rustic potatoes tossed in premium black truffle oil, rosemary, and grated parmigiano reggiano.',
        price: 9.50,
        isVeg: true,
        image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=600&auto=format&fit=crop&q=60',
      },
      {
        categoryId: categoryMap['Starters'],
        name: 'Avocado Bruschetta',
        description: 'Toasted sourdough baguette slices topped with creamy mashed avocado, diced roma tomatoes, garlic, and basil.',
        price: 11.00,
        isVeg: true,
        image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=600&auto=format&fit=crop&q=60',
      },
      {
        categoryId: categoryMap['Starters'],
        name: 'Flame-Seared Scallops',
        description: 'Fresh Atlantic giant scallops lightly torched and served over green pea purée with lemon-herb butter.',
        price: 24.00,
        isVeg: false,
        image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&auto=format&fit=crop&q=60',
      },
      {
        categoryId: categoryMap['Main Course'],
        name: 'Signature Spicy Ramen',
        description: 'Rich, slow-simmered broth infused with roasted chili oils, torch-seared pork chashu, and marinated egg.',
        price: 16.50,
        isVeg: false,
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=60',
      },
      {
        categoryId: categoryMap['Main Course'],
        name: 'Truffle Mushroom Pasta',
        description: 'Linguine pasta tossed with a rich forest mushroom cream sauce, wild mushrooms, and aromatic truffle oil.',
        price: 18.00,
        isVeg: true,
        image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=60',
      },
      {
        categoryId: categoryMap['Main Course'],
        name: 'Truffle Glazed Wagyu Steak',
        description: 'A-Grade Wagyu beef pan-seared to medium-rare, glazed with black truffle reduction, served with asparagus.',
        price: 45.00,
        isVeg: false,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60',
      },
      {
        categoryId: categoryMap['Snacks'],
        name: 'Loaded Nacho Plate',
        description: 'Crispy stone-ground chips covered with hot cheddar sauce, beans, jalapeños, and fresh guacamole.',
        price: 12.50,
        isVeg: true,
        image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=60',
      },
      {
        categoryId: categoryMap['Desserts'],
        name: 'Chocolate Lava Cake',
        description: 'Decadent warm chocolate cake with a molten fudge core, served with fresh raspberry reduction and vanilla bean gelato.',
        price: 8.50,
        isVeg: true,
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=60',
      },
      {
        categoryId: categoryMap['Drinks'],
        name: 'Premium Fruit Mocktail',
        description: 'Refreshing blend of pressed wild berries, mint sprigs, sparkling soda, and organic raw honey syrup.',
        price: 6.50,
        isVeg: true,
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=60',
      }
    ];

    // Clear existing menu items and categories first to prevent duplication issues
    await prisma.menuItem.deleteMany({});
    await prisma.category.deleteMany({});

    for (const item of menuItems) {
      await prisma.menuItem.create({ data: item });
    }

    return new Response(
      `<html>
        <head>
          <title>Database Seed Success</title>
          <meta http-equiv="refresh" content="2;url=/" />
          <style>
            body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f8f9ff; color: #121c2a; }
            .card { background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; border: 1px solid #e1bfb5; max-width: 400px; }
            h1 { color: #006e2d; margin-top: 0; font-size: 1.8rem; }
            p { margin-bottom: 0; color: #594139; font-size: 1rem; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Database Seeded!</h1>
            <p>Redirecting back to LuxeDine POS...</p>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: any) {
    console.error('Seed API error:', error);
    return NextResponse.json({ error: error.message || 'Seeding failed' }, { status: 500 });
  }
}
