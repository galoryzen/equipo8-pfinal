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

export interface RegisterPayload {
  email: string;
  username: string;
  phone: string;
  country_code: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  role: string;
  hotel_id?: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
  country_code?: string | null;
  hotel_id?: string | null;
}
