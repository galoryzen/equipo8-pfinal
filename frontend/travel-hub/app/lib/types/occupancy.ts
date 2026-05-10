/** Booking occupancy API — snake_case matches backend JSON. */

export type OccupancyLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface OccupancyDay {
  date: string;
  total_rooms: number;
  occupied_rooms: number;
  blocked_rooms: number;
  available_rooms: number;
  occupancy_rate: number;
  occupancy_level: OccupancyLevel;
}

export interface OccupancyCalendarResponse {
  property_id: string;
  date_from: string;
  date_to: string;
  days: OccupancyDay[];
}

export interface RoomTypeOccupancyBreakdownRow {
  room_type_id: string;
  room_type_name: string;
  total_rooms: number;
  occupied_rooms: number;
  blocked_rooms: number;
  available_rooms: number;
  occupancy_rate: number;
  occupancy_level: OccupancyLevel;
}

export interface OccupancyDailyBreakdownResponse {
  property_id: string;
  date: string;
  room_types: RoomTypeOccupancyBreakdownRow[];
}

export interface ProjectionDayAlert {
  type: string;
  message: string;
}

export interface OccupancyProjectionDay {
  date: string;
  occupancy_rate: number;
  occupancy_level: OccupancyLevel;
  alert: ProjectionDayAlert | null;
}

export interface LowOccupancyPeriodAlert {
  type: string;
  date_from: string;
  date_to: string;
  average_occupancy_rate: number;
}

export interface OccupancyProjectionResponse {
  property_id: string;
  date_from: string;
  date_to: string;
  days: OccupancyProjectionDay[];
  alerts: LowOccupancyPeriodAlert[];
}
