import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.delete({ where: { email: 'b.l.tharun1465@gmail.com' } });
  console.log('Successfully deleted orphaned user record from Prisma database.');
}
main().finally(() => prisma.$disconnect());
