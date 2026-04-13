import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Create Main Outlet
  const mainOutlet = await prisma.outlet.upsert({
    where: { id: "outlet-main" },
    update: {},
    create: {
      id: "outlet-main",
      name: "Main Outlet",
      address: "Jl. Utama No. 1",
      phone: "081234567890",
      isHeadquarters: true,
    },
  });
  console.log("✅ Main Outlet created");

  // 2. Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@pos.com" },
    update: { outletId: mainOutlet.id },
    create: {
      name: "Administrator",
      email: "admin@pos.com",
      password: adminPassword,
      role: "ADMIN",
      outletId: mainOutlet.id,
    },
  });

  // 3. Create cashier user
  const cashierPassword = await bcrypt.hash("kasir123", 10);
  await prisma.user.upsert({
    where: { email: "kasir@pos.com" },
    update: { outletId: mainOutlet.id },
    create: {
      name: "Kasir 1",
      email: "kasir@pos.com",
      password: cashierPassword,
      role: "CASHIER",
      outletId: mainOutlet.id,
    },
  });
  console.log("✅ Users created");

  // 4. Create categories
  await Promise.all([
    prisma.category.upsert({
      where: { id: "cat-makanan" },
      update: {},
      create: { id: "cat-makanan", name: "Makanan", description: "Berbagai jenis makanan" },
    }),
    prisma.category.upsert({
      where: { id: "cat-minuman" },
      update: {},
      create: { id: "cat-minuman", name: "Minuman", description: "Berbagai jenis minuman" },
    }),
    prisma.category.upsert({
      where: { id: "cat-snack" },
      update: {},
      create: { id: "cat-snack", name: "Snack", description: "Makanan ringan" },
    }),
  ]);
  console.log("✅ Categories created");

  // 5. Create products and stock
  const products = [
    { name: "Nasi Goreng", sku: "MKN001", price: 25000, stock: 100, categoryId: "cat-makanan" },
    { name: "Mie Goreng", sku: "MKN002", price: 22000, stock: 100, categoryId: "cat-makanan" },
    { name: "Ayam Geprek", sku: "MKN003", price: 28000, stock: 50, categoryId: "cat-makanan" },
    { name: "Es Teh Manis", sku: "MNM001", price: 5000, stock: 200, categoryId: "cat-minuman" },
    { name: "Es Jeruk", sku: "MNM002", price: 7000, stock: 150, categoryId: "cat-minuman" },
    { name: "Kopi Susu", sku: "MNM003", price: 15000, stock: 100, categoryId: "cat-minuman" },
    { name: "Keripik Singkong", sku: "SNK001", price: 10000, stock: 80, categoryId: "cat-snack" },
    { name: "Kacang Goreng", sku: "SNK002", price: 8000, stock: 100, categoryId: "cat-snack" },
  ];

  for (const p of products) {
    // Create product (without stock)
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        sku: p.sku,
        price: p.price,
        categoryId: p.categoryId,
      },
    });

    // Create/Update ProductStock for Main Outlet
    await prisma.productStock.upsert({
      where: { productId_outletId: { productId: product.id, outletId: mainOutlet.id } },
      update: {}, // Don't reset stock if already exists
      create: {
        productId: product.id,
        outletId: mainOutlet.id,
        stock: p.stock,
      },
    });
  }
  console.log("✅ Products and Stock created");

  // 6. Create Guides
  await Promise.all([
    prisma.guide.upsert({
      where: { id: "guide-1" },
      update: {},
      create: { id: "guide-1", name: "Budi Santoso", phone: "0811111111", isActive: true, outletId: mainOutlet.id }
    }),
    prisma.guide.upsert({
      where: { id: "guide-2" },
      update: {},
      create: { id: "guide-2", name: "Agus Riyadi", phone: "0822222222", isActive: true, outletId: mainOutlet.id }
    })
  ]);
  console.log("✅ Guides created");

  // 7. Create Activity Packages
  const pkg1 = await prisma.activityPackage.upsert({
    where: { id: "pkg-rafting-1" },
    update: {},
    create: {
      id: "pkg-rafting-1",
      name: "Rafting Sungai Ayung",
      description: "Pengalaman seru menyusuri sungai Ayung dengan jeram kelas 2-3.",
      basePrice: 250000,
      childPrice: 200000,
      maxCapacity: 30,
      durationMinutes: 120,
      outletId: mainOutlet.id,
    }
  });

  const pkg2 = await prisma.activityPackage.upsert({
    where: { id: "pkg-atv-1" },
    update: {},
    create: {
      id: "pkg-atv-1",
      name: "ATV Jungle Trek",
      description: "Jelajahi hutan tropis menyusuri trek menantang menggunakan ATV.",
      basePrice: 350000,
      childPrice: 300000,
      maxCapacity: 20,
      durationMinutes: 90,
      outletId: mainOutlet.id,
    }
  });
  console.log("✅ Activity Packages created");

  // 8. Create Session Times
  await Promise.all([
    // Sessions for Rafting
    prisma.sessionTime.upsert({
      where: { id: "sess-rafting-morning" },
      update: {},
      create: {
        id: "sess-rafting-morning",
        activityPackageId: pkg1.id,
        startTime: "09:00",
        label: "Pagi",
        capacityOverride: null
      }
    }),
    prisma.sessionTime.upsert({
      where: { id: "sess-rafting-afternoon" },
      update: {},
      create: {
        id: "sess-rafting-afternoon",
        activityPackageId: pkg1.id,
        startTime: "13:00",
        label: "Siang",
        capacityOverride: null
      }
    }),
    // Sessions for ATV
    prisma.sessionTime.upsert({
      where: { id: "sess-atv-morning" },
      update: {},
      create: {
        id: "sess-atv-morning",
        activityPackageId: pkg2.id,
        startTime: "10:00",
        label: "Pagi",
        capacityOverride: null
      }
    }),
  ]);
  console.log("✅ Session Times created");

  console.log("🎉 Seed completed!");
  console.log("👤 Admin: admin@pos.com / admin123");
  console.log("👤 Kasir: kasir@pos.com / kasir123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
