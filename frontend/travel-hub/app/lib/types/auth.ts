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
