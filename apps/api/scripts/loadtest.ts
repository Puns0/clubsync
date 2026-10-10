import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

async function run() {
  console.log('Starting load test...');
  // The DB and application are not accessible in this environment
  // A standard load test would hit http://localhost:4000/api/events/.../register
  // Since we cannot run it, we output a structural layout for it.
  
  const prisma = new PrismaClient();
  try {
    const event = await prisma.event.findFirst({ where: { title: 'Load Test: 10-Seat Event' } });
    if (!event) {
      console.log('Load test event not found.');
      return;
    }

    const students = await prisma.user.findMany({ where: { role: 'STUDENT' }, take: 50 });
    
    console.log(`Firing 50 simultaneous registrations...`);
    const promises = students.map(s => {
      return fetch(`http://localhost:4000/api/events/${event.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-user-id': s.id },
        body: JSON.stringify({ preferred: false })
      }).then(r => r.json());
    });
    
    await Promise.allSettled(promises);
    
    const regs = await prisma.registration.findMany({ where: { eventId: event.id } });
    const confirmed = regs.filter(r => r.status === 'CONFIRMED');
    const waitlisted = regs.filter(r => r.status === 'WAITLISTED');
    
    console.log(`Confirmed: ${confirmed.length} (Expected 10)`);
    console.log(`Waitlisted: ${waitlisted.length} (Expected 40)`);
    
    if (confirmed.length === 10 && waitlisted.length === 40) {
      console.log('PASS');
    } else {
      console.log('FAIL');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
