import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const prod = await prisma.product.findFirst({
    where: { sku: 'MKN003' },
    include: { stocks: true }
  });
  console.log("BEFORE:", prod?.stocks[0].stock);

  // simulate transaction
  await prisma.productStock.upsert({
    where: { productId_outletId: { productId: prod!.id, outletId: 'outlet-main' } },
    update: { stock: { decrement: 1 } },
    create: { productId: prod!.id, outletId: 'outlet-main', stock: -1 }
  });

  const prodAfter = await prisma.product.findFirst({
    where: { sku: 'MKN003' },
    include: { stocks: true }
  });
  console.log("AFTER:", prodAfter?.stocks[0].stock);
}

main().catch(console.error).finally(() => prisma.$disconnect());
