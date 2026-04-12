import { getPropertyDetail } from '@/app/lib/api/catalog';
import type { PropertyDetail } from '@/app/lib/types/catalog';

export type PropertyByIdMap = Record<string, PropertyDetail | null>;

/**
 * One catalog request per unique property id (parallel). Failures become null entries.
 */
export async function fetchPropertyDetailsMap(ids: string[]): Promise<PropertyByIdMap> {
  if (ids.length === 0) return {};
  const pairs = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await getPropertyDetail(id);
        return [id, res.detail] as const;
      } catch {
        return [id, null] as const;
      }
    })
  );
  return Object.fromEntries(pairs);
}
