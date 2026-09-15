import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'b.l.tharun1465@gmail.com' } });
  console.log('Email query:', user);

  const userByUsername = await prisma.user.findUnique({ where: { username: 'spyro' } });
  console.log('Username query:', userByUsername);
}
main().finally(() => prisma.$disconnect());
