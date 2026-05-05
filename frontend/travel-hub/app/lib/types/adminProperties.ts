import { ManagerHotelItem } from '@/app/lib/types/manager';

export interface GetAdminPropertiesResponse {
  items: ManagerHotelItem[];
  message: string;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type AdminProperty = { id: string; name: string };

type AdminPropertiesFetchErrorKind = 'unauthorized' | 'network' | 'server';

type AdminPropertiesFetchError = Error & {
  status?: number;
  kind: AdminPropertiesFetchErrorKind;
};

export function createAdminPropertiesFetchError(
  message: string,
  opts: { status?: number; kind: AdminPropertiesFetchErrorKind }
): AdminPropertiesFetchError {
  const err = new Error(message) as AdminPropertiesFetchError;
  err.name = 'AdminPropertiesFetchError';
  err.status = opts.status;
  err.kind = opts.kind;
  return err;
}
