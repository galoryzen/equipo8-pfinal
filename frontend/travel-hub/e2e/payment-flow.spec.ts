import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

import {
  TEST_DESTINATIONS,
  TEST_USERS,
  generateBookingOwnerInfo,
  generateGuestInfo,
  generatePaymentInfo,
  getBookingDates,
} from './fixtures/testData';
import { BookingPage } from './pages/BookingPage';
import { HotelDetailsPage } from './pages/HotelDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentConfirmationPage } from './pages/PaymentConfirmationPage';
import { SearchPage } from './pages/SearchPage';
import { AdditionalGuest, CreditCardInfo, OwnerInfo } from './pages/types';
import { calculateNights, formatDateRange } from './utils/testHelpers';

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
  let paymentConfirmationPage: PaymentConfirmationPage;

  test.beforeEach(async ({ page }) => {
    // Initialize all page objects
    loginPage = new LoginPage(page);
    searchPage = new SearchPage(page);
    hotelDetailsPage = new HotelDetailsPage(page);
    bookingPage = new BookingPage(page);
    paymentConfirmationPage = new PaymentConfirmationPage(page);
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
    expect(bookingSummary.dates?.toLocaleLowerCase()).toBe('📅 ' + formattedDates.toLowerCase());
    expect(bookingSummary.guests_nights?.toLocaleLowerCase()).toBe(
      (number_of_nights + ' nights • ' + DEFAULT_GUESTS_COUNT + ' guests').toLowerCase()
    );

    const ownerInfo: OwnerInfo = generateBookingOwnerInfo();

    const additionalGuests: AdditionalGuest[] = Array.from(
      { length: ADDITIONAL_GUESTS_COUNT },
      (_, i) => ({
        id: i.toString(),
        firstName: generateGuestInfo().firstName,
        lastName: generateGuestInfo().lastName,
      })
    );

    const creditCardInfo: CreditCardInfo = {
      number: paymentInfo.cardNumber,
      expiry: paymentInfo.expiryDate,
      cvv: paymentInfo.cvv,
      name: paymentInfo.cardholderName,
    };

    // Proceed with booking
    await bookingPage.proceedWithBooking(ownerInfo, additionalGuests, creditCardInfo);

    // ── STEP 6: Verify payment confirmation ──
    await paymentConfirmationPage.waitForPageLoad();

    // Verify confirmation page is displayed
    const isConfirmed = await paymentConfirmationPage.isPageDisplayed();
    expect(isConfirmed).toBeTruthy();

    // Get booking reference
    const bookingReference = await paymentConfirmationPage.getBookingReference();
    expect(bookingReference).toBeTruthy();

    // Get full confirmation summary
    const confirmationSummary = await paymentConfirmationPage.getConfirmationSummary();

    // Verify property name
    expect(confirmationSummary.propertyName).toBe(destination.property);

    // Verify dates (check-in text contains the formatted date)
    expect(confirmationSummary.checkinDate?.toLocaleLowerCase()).toContain(
      formatDateRange(dates.checkIn, dates.checkOut, true).toLowerCase()
    );

    // Verify room name
    expect(confirmationSummary.roomName).toBe(DEFAULT_ROOM_NAME);

    // Verify guests count
    expect(confirmationSummary.guests).toContain(String(DEFAULT_GUESTS_COUNT));

    // Verify status is pending
    expect(confirmationSummary.status?.toLocaleLowerCase()).toContain('pending');

    // Verify total price is displayed
    expect(confirmationSummary.totalPrice).toBeTruthy();
  });
});
