const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

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

  console.log('Created Users:', { admin: admin.email, kitchen: kitchen.email });

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
  console.log('Seeded 10 Tables.');

  // 3. Create Categories
  const categories = [
    { name: 'Starters' },
    { name: 'Main Course' },
    { name: 'Snacks' },
    { name: 'Desserts' },
    { name: 'Drinks' },
  ];

  const categoryMap = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryMap[cat.name] = created.id;
  }
  console.log('Seeded 5 Categories.');

  // 4. Create Menu Items (30 sample dishes)
  const menuItems = [
    // --- Starters ---
    {
      categoryId: categoryMap['Starters'],
      name: 'Garden Medley Salad',
      description: 'Vibrant organic greens, cherry tomatoes, cucumbers, and shaved carrots served with fresh balsamic glaze.',
      price: 12.00,
      isVeg: true,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8KSl2JbU3uZWa4r-75nF9THGVlzxfyYTuq2lydGSkckgPCQGwrGkGF8MswFNDDTvDHpYsBqrFvS9jYVrbDuC_esrAsX2xlEPhwToKPp8hIhfn1unTiljMPBu_nqnSnOk8YS0OTp3bgGJq9K5IUcIJ-CxrZVF72dFKI8G6qy_hWTKkFY_tVILe8SH4IQkU8UZNhfFEM_1bcj3BhVvx8tkgEPiaR5oH4E8RS9VJ0eQlUPhxyVWI6ZI2ebrFPH118fz-R6fod213eCY',
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
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmo9gQLKWMLD9ZZptY6SFK3HdGzqItx1N5Xx4g-WZ9v9Q38CsEBCzMZUDcy3Ws2XpTvjfLvOxyDK8cbnuEUsh0xVOljjOfMYfDy9vyKj7dgOEKCyZoxODRu9RLnNl2BroIT7YEG0dj1bHQ-TtE6-99p2Tivo_ZxMmGqywUlytalixug9LSv3VsMIueWHQ_9VohjQ3aXckMsiyWWPfWC_5Aytb7azWF99nEL6d5LugBPRXRUVKsKBlt551041CqSX-K2W6ZdsxVuqM',
    },
    {
      categoryId: categoryMap['Starters'],
      name: 'Stuffed Portobello Cups',
      description: 'Portobello mushroom caps stuffed with spinach, cream cheese, and herbs, baked to crispy perfection.',
      price: 13.00,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Starters'],
      name: 'Panko Shrimp Sticks',
      description: 'Crunchy panko-crusted prawns skewers accompanied by a sweet, tangy sweet-chili dipping sauce.',
      price: 14.00,
      isVeg: false,
      image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=60',
    },

    // --- Main Course ---
    {
      categoryId: categoryMap['Main Course'],
      name: 'Signature Spicy Ramen',
      description: 'Rich, slow-simmered 18-hour pork bone broth infused with roasted chili oils, torch-seared chashu, and ajitsuke tamago.',
      price: 16.50,
      isVeg: false,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjktTutHxGEc8tlh-5Ra-utVLaTpECw1oPeLyGWePn-O5wQjIoHU-Z9COtS2lq_R3GAS3AZqffW8BMZ0dzI1a-Bnuhcwjvb1DRSHodMNc6_Z4X1LOgy1feKHpy-pjtrUOUSIv4xeKZIe1EvPYnR7pIucxgCrpf6nm0ZsTVEMNGRTHRF8Px5a9UVYlIDqyIM8FrOTRtYBqGB49TyMCXVFBCmx0VgrI4AMgeCWyDaZtUu0lxXPM9TrTBL066EUcSpBmY-KzL0qeE6Js',
    },
    {
      categoryId: categoryMap['Main Course'],
      name: 'Truffle Mushroom Pasta',
      description: 'Linguine pasta tossed with a rich forest mushroom cream sauce, wild white mushrooms, and aromatic white truffle oil.',
      price: 18.00,
      isVeg: true,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuRKLsjpUFTJy0DzyUh6kTumkWQjHK7mFe_86q5N4oy_cEuRaIuEAUagF4v_4aRbs7kjiRVk5ojLnXFzplpeXrez1Z0tUsRW7estFMjDdU5VlJD3jfo52RfMXzts78hAuIxRd7uC-972QjrQg-zYlYAPlgSjL03NjTisxIkiTsufzkZHWx2k4mX4XFrFdVXYXc908jrEfmun5N9aQ55QI6UDRHRx_Jzw3eiIDyrtK1hGBY_hOLPP8KBuaGO5YKwcXmHb8wWzMXbHk',
    },
    {
      categoryId: categoryMap['Main Course'],
      name: 'Zesty Grill Chicken Burger',
      description: 'Juicy flame-grilled chicken breast glazed with peri-peri marinade, served with spicy mayo, cheddar, and house slaw.',
      price: 14.50,
      isVeg: false,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAn-h4MbFMywCkjdoD_Oveg8ki-Bg3O7tRuisSGlvi7fHYUOVMuT6NjuGj2pZ52nqUARjcBKhoVaJHLBO8K8njVsB9m_VVGm5px4u7oOJYk3t2Tq0-BxmYay0LXioRAowbpS7qpfhC9OwkbUpO_bjZNfYddk3JFogbwiyaX3hjvyFseaaW1YI6Apq4AeyJetHFkJePsaTH894xmsoexfWxnKoB2EYtUFVNz3MkbJNqhkJF_XtF_imUac9mpOZxR__37JBRVLa1qchM',
    },
    {
      categoryId: categoryMap['Main Course'],
      name: 'Truffle Glazed Wagyu Steak',
      description: 'A-Grade hand-cut Wagyu beef steak pan-seared to medium-rare, glazed with black truffle reduction, served with grilled asparagus.',
      price: 45.00,
      isVeg: false,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Main Course'],
      name: 'Pan-Seared Herb Salmon',
      description: 'Crispy skin Atlantic salmon fillet drizzled with lemon herb sauce, placed on creamed spinach bed.',
      price: 26.50,
      isVeg: false,
      image: 'https://images.unsplash.com/photo-1485921325814-a5344aec7c9d?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Main Course'],
      name: 'Wild Mushroom Risotto',
      description: 'Creamy arborio rice slow-cooked with white wine broth, forest mushrooms, and shaved parmesan cheese.',
      price: 21.00,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop&q=60',
    },

    // --- Snacks ---
    {
      categoryId: categoryMap['Snacks'],
      name: 'Loaded Nacho Plate',
      description: 'Crispy stone-ground tortilla chips covered with hot cheddar cheese sauce, black beans, jalapeños, and fresh pico de gallo.',
      price: 12.50,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Snacks'],
      name: 'Spicy Buffalo Wings',
      description: 'Crispy fried chicken wings tossed in signature buffalo hot sauce, served with celery and ranch dip.',
      price: 11.50,
      isVeg: false,
      image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Snacks'],
      name: 'Crispy Onion Strings',
      description: 'Thinly sliced Spanish onions battered in spiced flour, fried until light and golden-brown, with honey mustard.',
      price: 7.00,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Snacks'],
      name: 'Mozzarella Pull Sticks',
      description: 'Gooey melted mozzarella sticks coated in seasoned breadcrumbs, with robust marinara dipping sauce.',
      price: 8.50,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1531749668029-2db88e4b76c0?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Snacks'],
      name: 'Chicken Soft Tacos',
      description: 'Three soft corn tortillas filled with spiced shredded chicken, lime crema, pickled red onions, and cilantro.',
      price: 13.00,
      isVeg: false,
      image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Snacks'],
      name: 'Vegetable Spring Rolls',
      description: 'Thin pastry rolls stuffed with sautéed cabbage, carrots, mushrooms, and glass noodles, served with plum sauce.',
      price: 8.00,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60',
    },

    // --- Desserts ---
    {
      categoryId: categoryMap['Desserts'],
      name: 'Matcha Lava Fondant',
      description: 'A decadent chocolate cake shell containing a molten core of ceremonial Japanese green tea matcha.',
      price: 9.50,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Desserts'],
      name: 'Madagascar Vanilla Bean Panna Cotta',
      description: 'Silky smooth eggless vanilla custard served chilled with fresh raspberries and red berry coulis.',
      price: 8.50,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Desserts'],
      name: 'Double Chocolate Fudge Cake',
      description: 'Rich, moist chocolate sponge layered with smooth dark chocolate ganache, served warm with vanilla scoop.',
      price: 10.00,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Desserts'],
      name: 'Salted Caramel Tart',
      description: 'Buttery pastry shell filled with soft, gooey salted caramel, topped with dark chocolate glaze and sea salt flakes.',
      price: 9.00,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Desserts'],
      name: 'Sicilian Citrus Cheesecake',
      description: 'Creamy baked cheesecake infused with blood orange and lemon zest, with graham cracker crust base.',
      price: 10.50,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1524351199679-46cddf530c04?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Desserts'],
      name: 'Artisanal Gelato Scoop (3 Flavors)',
      description: 'Choose three scoops of our house-churned gelato: Pistachio, Dark Chocolate, or Mango Sorbet.',
      price: 7.50,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=60',
    },

    // --- Drinks ---
    {
      categoryId: categoryMap['Drinks'],
      name: 'Iced Matcha Latte',
      description: 'Whisked ceremonial matcha green tea poured over chilled whole milk (or oat milk) and organic honey sweetener.',
      price: 6.00,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Drinks'],
      name: 'Classic Passionfruit Mojito',
      description: 'Refresing mocktail combining passionfruit pulp, fresh mint leaves, lime slices, sugar syrup, and soda water.',
      price: 6.50,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Drinks'],
      name: 'Cold Brew Citrus Coffee',
      description: '12-hour cold-brewed Ethiopian coffee beans served over ice blocks with fresh orange slice garnish.',
      price: 5.50,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Drinks'],
      name: 'Rosewater Lemon Cooler',
      description: 'Zesty lemonade subtly scented with organic rosewater syrup, garnished with edible rose petals.',
      price: 5.00,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Drinks'],
      name: 'Premium Jasmine Green Tea',
      description: 'A hot pot of premium loose jasmine tea leaves, steeped to yield a delicate floral scent.',
      price: 5.00,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=60',
    },
    {
      categoryId: categoryMap['Drinks'],
      name: 'Sparkling Mineral Water (750ml)',
      description: 'Chilled bottle of premium sparkling water, perfect as a refreshing palate cleanser during meals.',
      price: 4.50,
      isVeg: true,
      image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&auto=format&fit=crop&q=60',
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: `seed-${item.name.replace(/\s+/g, '-').toLowerCase()}` },
      update: {
        categoryId: item.categoryId,
        description: item.description,
        price: item.price,
        image: item.image,
        isVeg: item.isVeg,
      },
      create: {
        id: `seed-${item.name.replace(/\s+/g, '-').toLowerCase()}`,
        ...item,
      },
    });
  }
  console.log('Seeded 30 Menu Items.');

  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
