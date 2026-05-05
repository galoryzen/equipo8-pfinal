import { expect, test } from '@playwright/test';

import {
  TEST_DESTINATIONS,
  TEST_USERS,
  generateGuestInfo,
  generatePaymentInfo,
  getBookingDates,
} from './fixtures/testData';
import { BookingPage } from './pages/BookingPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { HotelDetailsPage } from './pages/HotelDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentPage } from './pages/PaymentPage';
import { SearchPage } from './pages/SearchPage';
import { AdditionalGuest, OwnerInfo } from './pages/types';
import { calculateNights, formatDateRange } from './utils/testHelpers';

import { faker } from '@faker-js/faker';


/**
 * E2E Test Suite: Complete Payment Flow
 *
 * Tests the full user journey:
 * 1. Login
 * 2. Search for properties
 * 3. Select hotel and dates
 * 4. Select room type
 * 5. Fill booking information
 * 6. Process payment
 * 7. Verify confirmation and check-in readiness
 *
 * Uses Page Object Model (POM) architecture for maintainability and scalability
 */

const DEFAULT_GUESTS_COUNT = 2;
const ADDITIONAL_GUESTS_COUNT = 1;
const DEFAULT_ROOM_INDEX = 0;
const DEFAULT_ROOM_NAME = 'Estándar Vista al Mar';

test.describe('E2E: Complete Booking & Payment Flow', () => {
  let loginPage: LoginPage;
  let searchPage: SearchPage;
  let hotelDetailsPage: HotelDetailsPage;
  let bookingPage: BookingPage;
  let paymentPage: PaymentPage;
  let confirmationPage: ConfirmationPage;

  test.beforeEach(async ({ page }) => {
    // Initialize all page objects
    loginPage = new LoginPage(page);
    searchPage = new SearchPage(page);
    hotelDetailsPage = new HotelDetailsPage(page);
    bookingPage = new BookingPage(page);
    paymentPage = new PaymentPage(page);
    confirmationPage = new ConfirmationPage(page);
  });

  test('should complete booking flow: Cancún property', async ({ page }) => {
    // Test data
    const user = TEST_USERS.traveler;
    const destination = TEST_DESTINATIONS[0]; // Cancún
    const dates = getBookingDates(7, 10); // 7-10 days from now
    const guestInfo = generateGuestInfo();
    const paymentInfo = generatePaymentInfo();

    // ── STEP 1: Login ──
    await loginPage.goToLoginPage();

    await loginPage.login(user.email, user.password);
    await loginPage.waitForRedirect();

    // Verify login was successful by checking we're redirected away from login
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');

    // ── STEP 2: Search for destination ──
    await searchPage.goToSearchPage();
    await searchPage.waitForPageLoad();

    const today = new Date();
    const checkInDate = new Date(today);
    checkInDate.setDate(checkInDate.getDate() + 7);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 3);

    await searchPage.performSearch(
      destination.name,
      dates.checkIn,
      dates.checkOut,
      DEFAULT_GUESTS_COUNT
    );

    // Verify properties are displayed
    await searchPage.waitForSearchResults();
    const propertyCount = await searchPage.getPropertyCount();
    expect(propertyCount).toBeGreaterThan(0);

    // ── STEP 3: Select property and view details ──
    const propertyNames = await searchPage.getPropertyNames();
    expect(propertyNames.length).toBeGreaterThan(0);

    // Click on the first property (Cancún resort)
    await searchPage.clickPropertyByIndex(0);
    await hotelDetailsPage.waitForPageLoad();

    // Verify hotel details are displayed
    const hotelName = await hotelDetailsPage.getHotelName();
    expect(hotelName).toBeTruthy();

    // Check check-in and check-out dates
    const hotelCheckInDate = await hotelDetailsPage.getCheckInDate();
    expect(hotelCheckInDate).toBe(dates.checkIn);

    // Check check-out date
    const hotelCheckOutDate = await hotelDetailsPage.getCheckOutDate();
    expect(hotelCheckOutDate).toBe(dates.checkOut);

    const rating = await hotelDetailsPage.getHotelRating();
    expect(rating).toBe('4.7');

    const roomNames = await hotelDetailsPage.getRoomNames();
    expect(roomNames).toContain(DEFAULT_ROOM_NAME);

    // Select first room (Standard room)
    await hotelDetailsPage.selectRoomByIndex(DEFAULT_ROOM_INDEX);

    // Verify redirect to booking
    await hotelDetailsPage.clickContinueButton();
    await hotelDetailsPage.waitForRedirectToBooking();

    console.log('checkIn', dates.checkIn);
    console.log('checkOut', dates.checkOut);

    // Calculate number of nights and format dates using utility functions
    const number_of_nights = calculateNights(dates.checkIn, dates.checkOut);
    const formattedDates = formatDateRange(dates.checkIn, dates.checkOut);

    // ── STEP 5: Fill booking information ──
    const bookingSummary = await bookingPage.getBookingSummary();
    expect(bookingSummary).toBeDefined();
    expect(bookingSummary.room).toBeDefined();
    expect(bookingSummary.dates).toBeDefined();
    expect(bookingSummary.guests_nights).toBeDefined();

    expect(bookingSummary.room).toBe(DEFAULT_ROOM_NAME);
    expect(bookingSummary.dates).toBe('📅 ' + formattedDates);
    expect(bookingSummary.guests_nights).toBe(number_of_nights + ' Nights • ' + DEFAULT_GUESTS_COUNT + ' Guests');

    const ownerInfo: OwnerInfo = {
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      email: guestInfo.email,
      phone: guestInfo.phone,
    };

    const additionalGuests: AdditionalGuest[] = Array.from({ length: ADDITIONAL_GUESTS_COUNT }, (_, i) => ({
      id: i.toString(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    }));

    // Proceed with booking
    await bookingPage.proceedWithBooking(ownerInfo, additionalGuests);

    // Verify redirect to payment
    await paymentPage.waitForPageLoad();

    // ── STEP 6: Process payment ──
    const paymentSummary = await paymentPage.getPaymentSummary();
    expect(paymentSummary.totalAmount).toBeTruthy();

    await paymentPage.fillPaymentInformation({
      cardNumber: paymentInfo.cardNumber,
      cardholderName: paymentInfo.cardholderName,
      expiryDate: paymentInfo.expiryDate,
      cvv: paymentInfo.cvv,
      billingAddress: paymentInfo.billingAddress,
      billingCity: paymentInfo.billingCity,
      billingState: paymentInfo.billingState,
      billingZip: paymentInfo.billingZip,
      billingCountry: paymentInfo.billingCountry,
    });

    await paymentPage.clickPayNow();

    // Wait for payment processing
    await paymentPage.waitForSuccessPage();

    // ── STEP 7: Verify confirmation ──
    await confirmationPage.waitForPageLoad();

    // Verify confirmation page is displayed
    const isConfirmed = await confirmationPage.isConfirmationPageDisplayed();
    expect(isConfirmed).toBeTruthy();

    // Get booking reference
    const bookingReference = await confirmationPage.getBookingReference();
    expect(bookingReference).toBeTruthy();

    // Verify booking details
    const confirmationDetails = await confirmationPage.getBookingDetails();
    expect(confirmationDetails.reference).toBeTruthy();
    expect(confirmationDetails.hotelName).toBeTruthy();
    expect(confirmationDetails.checkInDate).toBeTruthy();
    expect(confirmationDetails.checkOutDate).toBeTruthy();
    expect(confirmationDetails.totalPrice).toBeTruthy();

    // Verify check-in information is available
    const checkInTime = await confirmationPage.getCheckInTime();
    expect(checkInTime).toBeTruthy();

    const locationInfo = await confirmationPage.getLocationInfo();
    expect(locationInfo).toBeTruthy();

    // Verify success
    const isSuccessful = await confirmationPage.verifyBookingConfirmed();
    expect(isSuccessful).toBeTruthy();
  });
});
