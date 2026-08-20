import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is not set');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const slug = 'demo-org';
  const superEmail = process.env['SUPERADMIN_EMAIL'] ?? 'superadmin@demo.com';

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (org) {
    console.log('Deleting organization:', slug);
    // cascade delete: delete users then org (adjust if your schema has CASCADE)
    await prisma.user.deleteMany({ where: { orgId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    console.log('Organization deleted.');
  } else {
    console.log('No organization found:', slug);
  }

  const superUser = await prisma.user.findFirst({ where: { email: superEmail } });
  if (superUser) {
    console.log('Deleting superadmin user:', superEmail);
    await prisma.user.deleteMany({ where: { email: superEmail } });
    console.log('Superadmin deleted.');
  } else {
    console.log('No superadmin user found:', superEmail);
  }
}

main()
  .then(() => { console.log('Reset complete.'); })
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
