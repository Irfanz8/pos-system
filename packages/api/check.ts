import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const prods = await prisma.product.findMany({ include: { stocks: true } });
  console.log("PRODUCTS:", JSON.stringify(prods, null, 2));

  const moves = await prisma.stockMovement.findMany({ 
    include: { product: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("LAST 5 MOVEMENTS:", JSON.stringify(moves, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
