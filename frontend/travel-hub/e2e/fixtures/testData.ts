import { faker } from '@faker-js/faker';

/**
 * Test data fixtures for E2E tests
 * Uses faker for generating mock data for non-authentication fields
 */

export const TEST_USERS = {
  traveler: {
    email: 'carlos@example.com',
    password: 'travelhub',
    name: 'Carlos García',
  },
  maria: {
    email: 'maria@example.com',
    password: 'travelhub',
    name: 'María López',
  },
  lucia: {
    email: 'lucia@example.com',
    password: 'travelhub',
    name: 'Lucía Fernández',
  },
};

export const TEST_DESTINATIONS = [
  {
    name: 'Cancún',
    property: 'Sol Caribe Cancún',
    city: 'Cancún',
    daneCode: 'D.42.1755.477409',
  },
  {
    name: 'Ciudad de México',
    property: 'Sol Reforma CDMX',
    city: 'CDMX',
    daneCode: 'D.42.1741.480381',
  },
  {
    name: 'Bogotá',
    property: 'Luna Andina Bogotá',
    city: 'Bogotá',
    daneCode: 'D.82.11.1',
  },
  {
    name: 'Buenos Aires',
    property: 'Luna Porteña Buenos Aires',
    city: 'Buenos Aires',
    daneCode: 'D.5.1818.790234',
  },
  {
    name: 'Madrid',
    property: 'Estrella Gran Vía Madrid',
    city: 'Madrid',
    daneCode: 'D.28.650.62172',
  },
  {
    name: 'Barcelona',
    property: 'Estrella Gótico Barcelona',
    city: 'Barcelona',
    daneCode: 'D.28.648.61405',
  },
];

export const TEST_ROOM_TYPES = {
  cancun: ['Estándar Vista al Mar', 'Suite Premium'],
  cdmx: ['Estándar', 'Deluxe Reforma'],
  bogota: ['Estándar', 'Suite Ejecutiva'],
  buenosAires: ['Estándar Palermo', 'Loft Premium'],
  madrid: ['Clásica Gran Vía', 'Suite Imperial'],
  barcelona: ['Estándar Gótico', 'Suite Medieval'],
};

/**
 * Generate random guest information for testing
 */
export function generateGuestInfo() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number('+1 (###) ###-####'),
    country: faker.location.country(),
  };
}

/**
 * Generate random payment information
 * NOTE: These are test values only - NOT for real transactions
 */
export function generatePaymentInfo() {
  return {
    cardNumber: '4111111111111111', // Test Visa card
    cardholderName: faker.person.fullName().toUpperCase(),
    expiryDate: '12/25',
    cvv: '123',
    billingAddress: faker.location.streetAddress(),
    billingCity: faker.location.city(),
    billingState: faker.location.state({ abbreviated: true }),
    billingZip: faker.location.zipCode(),
    billingCountry: faker.location.country(),
  };
}

/**
 * Generate booking details for form filling
 */
export function generateBookingDetails() {
  return {
    guest: generateGuestInfo(),
    specialRequests: faker.word.words(5),
    notes: faker.lorem.sentence(),
  };
}

/**
 * Get dates for booking (from X days to Y days from today)
 */
export function getBookingDates(startDaysFromNow: number = 7, endDaysFromNow: number = 10) {
  const today = new Date();

  const checkIn = new Date(today);
  checkIn.setDate(checkIn.getDate() + startDaysFromNow);

  const checkOut = new Date(today);
  checkOut.setDate(checkOut.getDate() + endDaysFromNow);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  return {
    checkIn: formatDate(checkIn),
    checkOut: formatDate(checkOut),
    checkInFormatted: checkIn.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    checkOutFormatted: checkOut.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  };
}

/**
 * Get number of nights between two dates
 */
export function getNights(startDate: Date, endDate: Date): number {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Test data for payment processing scenarios
 */
export const PAYMENT_TEST_SCENARIOS = {
  validPayment: {
    cardNumber: '4111111111111111', // Visa
    cardholderName: 'TEST USER',
    expiryDate: '12/25',
    cvv: '123',
  },
  declinedCard: {
    cardNumber: '4000000000000002', // Will be declined
    cardholderName: 'TEST USER',
    expiryDate: '12/25',
    cvv: '123',
  },
  invalidCard: {
    cardNumber: '4242424242424241', // Invalid checksum
    cardholderName: 'TEST USER',
    expiryDate: '12/25',
    cvv: '123',
  },
  expiredCard: {
    cardNumber: '4111111111111111',
    cardholderName: 'TEST USER',
    expiryDate: '01/20', // Expired
    cvv: '123',
  },
};

/**
 * Amenities to validate from seed data
 */
export const EXPECTED_AMENITIES = {
  cancun: [
    'WiFi gratuito',
    'Piscina',
    'Desayuno incluido',
    'Gimnasio',
    'Spa',
    'Restaurante',
    'Bar',
    'Aire acondicionado',
  ],
  cdmx: [
    'WiFi gratuito',
    'Desayuno incluido',
    'Gimnasio',
    'Estacionamiento',
    'Restaurante',
    'Aire acondicionado',
  ],
  bogota: ['WiFi gratuito', 'Desayuno incluido', 'Gimnasio', 'Estacionamiento', 'Restaurante'],
  buenosAires: [
    'WiFi gratuito',
    'Piscina',
    'Gimnasio',
    'Spa',
    'Bar',
    'Aire acondicionado',
    'Acepta mascotas',
  ],
  madrid: [
    'WiFi gratuito',
    'Desayuno incluido',
    'Gimnasio',
    'Spa',
    'Estacionamiento',
    'Restaurante',
    'Bar',
    'Aire acondicionado',
  ],
  barcelona: ['WiFi gratuito', 'Restaurante', 'Bar', 'Acepta mascotas'],
};

/**
 * Hotel ratings from seed data
 */
export const EXPECTED_RATINGS = {
  cancun: 4.6,
  cdmx: 4.3,
  bogota: 4.1,
  buenosAires: 4.5,
  madrid: 4.8,
  barcelona: 3.9,
};

/**
 * Cancellation policies
 */
export const CANCELLATION_POLICIES = {
  full: {
    name: 'Cancelación gratuita 48h',
    type: 'FULL',
    refund: '100%',
  },
  partial: {
    name: 'Cancelación parcial 24h',
    type: 'PARTIAL',
    refund: '50%',
  },
  nonRefundable: {
    name: 'No reembolsable',
    type: 'NON_REFUNDABLE',
    refund: '0%',
  },
};
