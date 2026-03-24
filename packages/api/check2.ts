import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const prod = await prisma.product.findFirst({
    where: { sku: 'MKN003' },
    include: { stocks: true }
  });
  console.log("PRODUCT STOCKS:", JSON.stringify(prod, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
