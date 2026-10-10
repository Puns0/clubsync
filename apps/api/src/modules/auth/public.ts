import type { PrismaClient } from '@prisma/client';

export async function getUserById(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function isOrganizerOfClub(prisma: PrismaClient, userId: string, clubId: string) {
  const link = await prisma.clubOrganizer.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  return link?.approvedAt !== null;
}

export async function canOrganizerViewStudentContact(
  prisma: PrismaClient,
  organizerId: string,
  studentId: string
): Promise<boolean> {
  const organizerClubs = await prisma.clubOrganizer.findMany({
    where: { userId: organizerId, approvedAt: { not: null } },
  });
  if (organizerClubs.length === 0) return false;

  const clubIds = organizerClubs.map(c => c.clubId);
  const count = await prisma.registration.count({
    where: {
      userId: studentId,
      status: { not: 'CANCELLED' },
      event: { clubId: { in: clubIds } },
    }
  });

  return count > 0;
}
