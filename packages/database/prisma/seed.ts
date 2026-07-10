import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Create Demo Tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "demo-store" },
    update: {},
    create: {
      id: "tenant-demo",
      name: "Demo Store",
      slug: "demo-store",
    },
  });
  console.log("✅ Demo Tenant created:", demoTenant.name);

  // 2. Create Main Outlet (belongs to tenant)
  const mainOutlet = await prisma.outlet.upsert({
    where: { id: "outlet-main" },
    update: { tenantId: demoTenant.id },
    create: {
      id: "outlet-main",
      name: "Main Outlet",
      address: "Jl. Utama No. 1",
      phone: "081234567890",
      isHeadquarters: true,
      tenantId: demoTenant.id,
    },
  });
  console.log("✅ Main Outlet created");

  // 3. Create admin user (belongs to tenant)
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@pos.com" },
    update: { outletId: mainOutlet.id, tenantId: demoTenant.id },
    create: {
      name: "Administrator",
      email: "admin@pos.com",
      password: adminPassword,
      role: "ADMIN",
      outletId: mainOutlet.id,
      tenantId: demoTenant.id,
    },
  });

  // 4. Create cashier user (belongs to tenant)
  const cashierPassword = await bcrypt.hash("kasir123", 10);
  await prisma.user.upsert({
    where: { email: "kasir@pos.com" },
    update: { outletId: mainOutlet.id, tenantId: demoTenant.id },
    create: {
      name: "Kasir 1",
      email: "kasir@pos.com",
      password: cashierPassword,
      role: "CASHIER",
      outletId: mainOutlet.id,
      tenantId: demoTenant.id,
    },
  });
  console.log("✅ Users created");

  // 5. Create categories (belongs to tenant)
  await Promise.all([
    prisma.category.upsert({
      where: { id: "cat-makanan" },
      update: { tenantId: demoTenant.id },
      create: { id: "cat-makanan", name: "Makanan", description: "Berbagai jenis makanan", tenantId: demoTenant.id },
    }),
    prisma.category.upsert({
      where: { id: "cat-minuman" },
      update: { tenantId: demoTenant.id },
      create: { id: "cat-minuman", name: "Minuman", description: "Berbagai jenis minuman", tenantId: demoTenant.id },
    }),
    prisma.category.upsert({
      where: { id: "cat-snack" },
      update: { tenantId: demoTenant.id },
      create: { id: "cat-snack", name: "Snack", description: "Makanan ringan", tenantId: demoTenant.id },
    }),
  ]);
  console.log("✅ Categories created");

  // 6. Create products and stock (belongs to tenant)
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
    // Create product (without stock, with tenantId)
    const product = await prisma.product.upsert({
      where: { sku_tenantId: { sku: p.sku, tenantId: demoTenant.id } },
      update: {},
      create: {
        name: p.name,
        sku: p.sku,
        price: p.price,
        categoryId: p.categoryId,
        tenantId: demoTenant.id,
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

  console.log("🎉 Seed completed!");
  console.log("👤 Admin: admin@pos.com / admin123");
  console.log("👤 Kasir: kasir@pos.com / kasir123");
  console.log("🏪 Tenant: Demo Store (demo-store)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
