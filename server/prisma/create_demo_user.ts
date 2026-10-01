import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating user@buoyantmedia.com account...');

  const userPasswordHash = await bcrypt.hash('UserPassword123!', 10);

  let company = await prisma.company.findFirst({
    where: { companyCode: 'CMP-BM001' }
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        companyCode: 'CMP-BM001',
        name: 'Buoyant Media Tech Solutions Pvt Ltd',
        contactPerson: 'Client User',
        mobile: '+91-9876543210',
        email: 'user@buoyantmedia.com',
        address: 'Suite 402, Buoyant Media Tower, Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400051',
        country: 'India',
        gstNumber: '27BUOYM1234A1Z5',
        panNumber: 'BUOYM1234A',
        industry: 'Information Technology & Media',
        website: 'https://buoyantmedia.com',
        spcode: 'EX-000',
      }
    });
  }

  const clientUser = await prisma.user.upsert({
    where: { email: 'user@buoyantmedia.com' },
    update: {
      passwordHash: userPasswordHash,
      role: UserRole.CLIENT,
      companyId: company.id,
      isActive: true,
    },
    create: {
      email: 'user@buoyantmedia.com',
      passwordHash: userPasswordHash,
      username: 'clientuser',
      name: 'Client Demo User',
      phone: '+91-9876543210',
      role: UserRole.CLIENT,
      companyId: company.id,
      spcode: 'EX-000',
      isActive: true,
    },
  });

  console.log(`✅ Successfully created/updated user: ${clientUser.email} with password "UserPassword123!"`);
}

main()
  .catch((e) => {
    console.error('❌ Error creating demo user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
