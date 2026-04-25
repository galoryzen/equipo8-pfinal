// ─── Types ─────────────────────────────────────────────────────────────────

export type CancellationPolicyType = 'totallyRefundable' | 'partialRefundable' | 'nonRefundable';

export interface RoomTypeDetail {
  availabilityStart: Date;
  availabilityEnd: Date;
  discountPct: number;
  cancellationPolicy: CancellationPolicyType;
  refundPct: number;
  cancellationApplyDate: Date;
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  totalRooms: number;
  occupiedRooms: number;
  status: 'ACTIVE' | 'PENDING_REVIEW';
  imageUrl: string;
  categories: number;
}

export interface Room {
  id: string;
  number: string;
  type: string;
  status: 'AVAILABLE' | 'OCCUPIED';
  imageUrl: string;
}

export interface HotelStats {
  occupancyRate: number;
  activeBookings: number;
  monthlyRevenue: number;
}

export type RoomTypeIcon = 'king' | 'suite' | 'double' | 'penthouse' | 'standard';

export interface RoomTypeItem {
  id: string;
  name: string;
  icon: RoomTypeIcon;
  available: number;
  total: number;
}

// ─── Mock data ──────────────────────────────────────────────────────────────

export const MOCK_HOTELS: Hotel[] = [
  {
    id: 'HOTEL-001',
    name: 'Grand Plaza Resort',
    location: 'London, United Kingdom',
    totalRooms: 120,
    occupiedRooms: 36,
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80&h=80&fit=crop',
    categories: 5,
  },
  {
    id: 'HOTEL-002',
    name: 'Blue Bay Inn',
    location: 'Nice, France',
    totalRooms: 45,
    occupiedRooms: 9,
    status: 'PENDING_REVIEW',
    imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=80&h=80&fit=crop',
    categories: 3,
  },
  {
    id: 'HOTEL-003',
    name: 'Urban Stay',
    location: 'New York, USA',
    totalRooms: 85,
    occupiedRooms: 34,
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=80&h=80&fit=crop',
    categories: 4,
  },
];

export const MOCK_ROOMS: Record<string, Room[]> = {
  'HOTEL-001': [
    {
      id: 'r1',
      number: '401',
      type: 'DELUXE KING',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=280&fit=crop',
    },
    {
      id: 'r2',
      number: '402',
      type: 'SUITE',
      status: 'OCCUPIED',
      imageUrl: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&h=280&fit=crop',
    },
    {
      id: 'r3',
      number: '403',
      type: 'DELUXE TWIN',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=280&fit=crop',
    },
    {
      id: 'r4',
      number: '404',
      type: 'SUITE',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&h=280&fit=crop',
    },
    {
      id: 'r5',
      number: '405',
      type: 'DELUXE KING',
      status: 'OCCUPIED',
      imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=280&fit=crop',
    },
  ],
  'HOTEL-002': [
    {
      id: 'r6',
      number: '101',
      type: 'STANDARD',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=280&fit=crop',
    },
    {
      id: 'r7',
      number: '102',
      type: 'SUITE',
      status: 'OCCUPIED',
      imageUrl: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&h=280&fit=crop',
    },
    {
      id: 'r8',
      number: '103',
      type: 'DELUXE KING',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=280&fit=crop',
    },
  ],
  'HOTEL-003': [
    {
      id: 'r9',
      number: '201',
      type: 'DELUXE KING',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=280&fit=crop',
    },
    {
      id: 'r10',
      number: '202',
      type: 'DELUXE TWIN',
      status: 'OCCUPIED',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=280&fit=crop',
    },
    {
      id: 'r11',
      number: '203',
      type: 'SUITE',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&h=280&fit=crop',
    },
    {
      id: 'r12',
      number: '204',
      type: 'STANDARD',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=280&fit=crop',
    },
  ],
};

export const MOCK_HOTEL_STATS: Record<string, HotelStats> = {
  'HOTEL-001': { occupancyRate: 85, activeBookings: 42, monthlyRevenue: 24500 },
  'HOTEL-002': { occupancyRate: 80, activeBookings: 18, monthlyRevenue: 9800 },
  'HOTEL-003': { occupancyRate: 60, activeBookings: 25, monthlyRevenue: 15200 },
};

export const MOCK_ROOM_TYPE_DETAILS: Record<string, RoomTypeDetail> = {
  rt1: {
    availabilityStart: new Date('2026-11-01T14:00'),
    availabilityEnd: new Date('2026-03-31T11:00'),
    discountPct: 15,
    cancellationPolicy: 'partialRefundable',
    refundPct: 50,
    cancellationApplyDate: new Date('2026-10-15'),
  },
  rt2: {
    availabilityStart: new Date('2026-10-01T15:00'),
    availabilityEnd: new Date('2026-04-30T12:00'),
    discountPct: 20,
    cancellationPolicy: 'totallyRefundable',
    refundPct: 100,
    cancellationApplyDate: new Date('2026-09-30'),
  },
  rt3: {
    availabilityStart: new Date('2026-09-15T13:00'),
    availabilityEnd: new Date('2027-05-15T10:00'),
    discountPct: 10,
    cancellationPolicy: 'nonRefundable',
    refundPct: 0,
    cancellationApplyDate: new Date('2026-08-15'),
  },
  rt4: {
    availabilityStart: new Date('2026-12-01T16:00'),
    availabilityEnd: new Date('2027-02-28T09:00'),
    discountPct: 25,
    cancellationPolicy: 'partialRefundable',
    refundPct: 30,
    cancellationApplyDate: new Date('2026-11-30'),
  },
  rt5: {
    availabilityStart: new Date('2026-08-01T12:00'),
    availabilityEnd: new Date('2027-01-31T11:00'),
    discountPct: 5,
    cancellationPolicy: 'totallyRefundable',
    refundPct: 100,
    cancellationApplyDate: new Date('2026-12-31'),
  },
  rt6: {
    availabilityStart: new Date('2026-09-01T14:00'),
    availabilityEnd: new Date('2026-12-31T23:59'),
    discountPct: 12,
    cancellationPolicy: 'partialRefundable',
    refundPct: 40,
    cancellationApplyDate: new Date('2026-11-15'),
  },
  rt7: {
    availabilityStart: new Date('2026-10-15T10:00'),
    availabilityEnd: new Date('2027-02-28T12:00'),
    discountPct: 8,
    cancellationPolicy: 'nonRefundable',
    refundPct: 0,
    cancellationApplyDate: new Date('2026-10-01'),
  },
  rt8: {
    availabilityStart: new Date('2026-11-01T11:00'),
    availabilityEnd: new Date('2027-03-31T10:00'),
    discountPct: 18,
    cancellationPolicy: 'totallyRefundable',
    refundPct: 100,
    cancellationApplyDate: new Date('2026-10-15'),
  },
  rt9: {
    availabilityStart: new Date('2026-10-01T14:00'),
    availabilityEnd: new Date('2027-04-30T11:00'),
    discountPct: 22,
    cancellationPolicy: 'partialRefundable',
    refundPct: 60,
    cancellationApplyDate: new Date('2026-09-15'),
  },
  rt10: {
    availabilityStart: new Date('2026-12-15T15:00'),
    availabilityEnd: new Date('2027-06-30T12:00'),
    discountPct: 30,
    cancellationPolicy: 'totallyRefundable',
    refundPct: 100,
    cancellationApplyDate: new Date('2026-11-30'),
  },
  rt11: {
    availabilityStart: new Date('2027-01-01T12:00'),
    availabilityEnd: new Date('2027-06-30T10:00'),
    discountPct: 35,
    cancellationPolicy: 'partialRefundable',
    refundPct: 25,
    cancellationApplyDate: new Date('2026-12-31'),
  },
};

export const MOCK_ROOM_TYPES: Record<string, RoomTypeItem[]> = {
  'HOTEL-001': [
    { id: 'rt1', name: 'Deluxe King', icon: 'king', available: 12, total: 45 },
    { id: 'rt2', name: 'Executive Suite', icon: 'suite', available: 4, total: 15 },
    { id: 'rt3', name: 'Double Queen', icon: 'double', available: 8, total: 40 },
    { id: 'rt4', name: 'Penthouse', icon: 'penthouse', available: 1, total: 5 },
  ],
  'HOTEL-002': [
    { id: 'rt5', name: 'Standard Room', icon: 'standard', available: 10, total: 25 },
    { id: 'rt6', name: 'Executive Suite', icon: 'suite', available: 3, total: 10 },
    { id: 'rt7', name: 'Deluxe King', icon: 'king', available: 2, total: 10 },
  ],
  'HOTEL-003': [
    { id: 'rt8', name: 'Deluxe King', icon: 'king', available: 15, total: 40 },
    { id: 'rt9', name: 'Double Queen', icon: 'double', available: 12, total: 30 },
    { id: 'rt10', name: 'Executive Suite', icon: 'suite', available: 5, total: 10 },
    { id: 'rt11', name: 'Penthouse', icon: 'penthouse', available: 2, total: 5 },
  ],
};
