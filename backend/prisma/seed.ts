import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is not set');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const email    = 'admin@demo.com';
  const password = 'Demo@1234';
  const orgName  = 'Demo Org';
  const slug     = 'demo-org';

  // Superadmin account
  const superEmail = process.env['SUPERADMIN_EMAIL'] ?? 'superadmin@demo.com';
  const superPassword = process.env['SUPERADMIN_PASSWORD'] ?? 'Super@1234';

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    console.log('Seed already applied — org "demo-org" exists.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.organization.create({
    data: {
      name: orgName,
      slug,
      users: {
        create: {
          email,
          passwordHash,
          name: 'Admin User',
          role: 'admin',
        },
      },
    },
  });

  // Ensure superadmin exists (global user outside orgs)
  const superExisting = await prisma.user.findFirst({ where: { email: superEmail } });
  if (!superExisting) {
    // create or find a system org to attach the superadmin (schema requires orgId)
    const systemSlug = 'system';
    let systemOrg = await prisma.organization.findUnique({ where: { slug: systemSlug } });
    if (!systemOrg) {
      systemOrg = await prisma.organization.create({ data: { name: 'System', slug: systemSlug, isActive: false } });
      console.log('Created system org for superadmin.');
    }

    const superHash = await bcrypt.hash(superPassword, 12);
    await prisma.user.create({ data: { orgId: systemOrg.id, email: superEmail, passwordHash: superHash, name: 'Super Admin', role: 'superadmin', isActive: true } });
    console.log('Created superadmin: ', superEmail);
  }

  console.log('Seed complete.');
  console.log(`  Email    : ${email}`);
  console.log(`  Password : ${password}`);
  console.log(`  Role     : admin`);
  console.log(`  Org      : ${orgName}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
