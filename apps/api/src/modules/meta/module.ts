import { defineModule, defineRoute } from '../../core/module.js';
import { DEPARTMENTS, YEARS } from '@clubsync/shared';

export default defineModule({
  id: 'meta',
  part: 1,
  register({ prisma, config }) {
    // ── Health ──────────────────────────────────────────────
    defineRoute('health.get', (req, res) => {
      res.json({ status: 'ok', time: new Date().toISOString() });
    });

    // ── Meta Public ─────────────────────────────────────────
    defineRoute('meta.public', async (req, res) => {
      const clubs = await prisma.club.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      res.json({
        departments: Array.from(DEPARTMENTS),
        years: Array.from(YEARS),
        clubs,
        allowedEmailDomains: config.allowedEmailDomains,
        usnHint: 'e.g., 1SJ21CS001',
      });
    });
  },
});
