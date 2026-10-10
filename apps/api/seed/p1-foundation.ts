import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { loadConfig } from '../src/core/config.js';
import { createCryptoService } from '../src/core/crypto.js';

const prisma = new PrismaClient();
const config = loadConfig();
const crypto = createCryptoService(config);

async function main() {
  console.log('Seeding P1 data...');

  // Create admin
  const adminEmail = config.ADMIN_BOOTSTRAP_EMAIL;
  const adminPassword = config.ADMIN_BOOTSTRAP_PASSWORD;
  
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await argon2.hash(adminPassword);
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        department: 'CSE',
        year: 4,
        emailVerifiedAt: new Date(),
        usnEnc: crypto.encrypt('ADMIN123'),
        usnHash: crypto.usnBlindIndex('ADMIN123'),
        phoneEnc: crypto.encrypt('+919999999999'),
      },
    });
    console.log(`Created admin: ${adminEmail}`);
  }

  // Create some default clubs
  const defaultClubs = [
    { name: 'Tech Club', description: 'Technology and innovation' },
    { name: 'Cultural Club', description: 'Arts, music, and dance' },
    { name: 'Sports Club', description: 'Athletics and sports' },
  ];

  for (const club of defaultClubs) {
    await prisma.club.upsert({
      where: { name: club.name },
      create: club,
      update: {},
    });
  }

  // Create some default venues
  const defaultVenues = ['Auditorium', 'Seminar Hall 1', 'Seminar Hall 2', 'Ground', 'Lab 1'];
  
  for (const venue of defaultVenues) {
    await prisma.venue.upsert({
      where: { name: venue },
      create: { name: venue },
      update: {},
    });
  }

  console.log('P1 Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
