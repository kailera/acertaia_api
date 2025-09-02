// Quick check: count WhatsappNumbers and list a few rows
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.whatsappNumbers.count();
    console.log('whatsapp_numbers count:', count);
    if (count > 0) {
      const rows = await prisma.whatsappNumbers.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, userId: true, number: true, instance: true, createdAt: true },
      });
      console.log('recent rows:', JSON.stringify(rows, null, 2));
    }
  } catch (err) {
    console.error('Error querying whatsapp_numbers:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

