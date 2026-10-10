import type { PrismaClient } from '@prisma/client';
import { DEFAULT_SETTINGS, type SettingsDTO } from '@clubsync/shared';

export interface SettingsService {
  get(): Promise<SettingsDTO>;
  getAll(): Promise<SettingsDTO>;
  set(key: string, value: unknown, updatedById?: string): Promise<void>;
  setMultiple(entries: Record<string, unknown>, updatedById?: string): Promise<void>;
}

let cache: SettingsDTO | null = null;

export function createSettingsService(prisma: PrismaClient): SettingsService {
  async function loadAll(): Promise<SettingsDTO> {
    if (cache) return cache;

    const rows = await prisma.setting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const settings: SettingsDTO = {
      demoMode: (map.get('demoMode') as boolean) ?? DEFAULT_SETTINGS.demoMode,
      confirmWindowMinutes:
        (map.get('confirmWindowMinutes') as number) ?? DEFAULT_SETTINGS.confirmWindowMinutes,
      demoConfirmWindowSeconds:
        (map.get('demoConfirmWindowSeconds') as number) ??
        DEFAULT_SETTINGS.demoConfirmWindowSeconds,
      cancelCutoffMinutes:
        (map.get('cancelCutoffMinutes') as number) ?? DEFAULT_SETTINGS.cancelCutoffMinutes,
    };

    cache = settings;
    return settings;
  }

  function invalidateCache() {
    cache = null;
  }

  return {
    get: loadAll,
    getAll: loadAll,

    async set(key, value, updatedById) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: value as object, updatedById },
        update: { value: value as object, updatedById },
      });
      invalidateCache();
    },

    async setMultiple(entries, updatedById) {
      await prisma.$transaction(
        Object.entries(entries).map(([key, value]) =>
          prisma.setting.upsert({
            where: { key },
            create: { key, value: value as object, updatedById },
            update: { value: value as object, updatedById },
          }),
        ),
      );
      invalidateCache();
    },
  };
}
