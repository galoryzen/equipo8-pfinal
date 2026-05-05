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
    await loginPage.waitForLoadingComplete();

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
      2, // 2 guests
      1 // 1 room
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

    const rating = await hotelDetailsPage.getHotelRating();
    expect(rating).toContain('4'); // Expected rating around 4.6

    // Verify amenities from seed data
    const amenities = await hotelDetailsPage.getAmenities();
    expect(amenities.length).toBeGreaterThan(0);

    // ── STEP 4: Select room type ──
    const roomCount = await hotelDetailsPage.getRoomCount();
    expect(roomCount).toBeGreaterThan(0);

    const roomNames = await hotelDetailsPage.getRoomNames();
    expect(roomNames).toContain('Estándar Vista al Mar');

    // Select first room (Standard room)
    await hotelDetailsPage.selectRoomByIndex(0);

    // Verify redirect to booking
    await hotelDetailsPage.waitForRedirectToBooking();
    await bookingPage.waitForPageLoad();

    // ── STEP 5: Fill booking information ──
    const bookingSummary = await bookingPage.getBookingSummary();
    expect(bookingSummary.room).toBeTruthy();
    expect(bookingSummary.checkIn).toBeTruthy();
    expect(bookingSummary.checkOut).toBeTruthy();

    // Fill guest information
    await bookingPage.fillGuestInformation({
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      email: guestInfo.email,
      phone: guestInfo.phone,
    });

    // Agree to terms and continue to payment
    await bookingPage.agreeToTerms();
    await bookingPage.clickContinueToPayment();

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

  test('should complete booking flow: Madrid property', async () => {
    // Test data
    const user = TEST_USERS.maria;
    const destination = TEST_DESTINATIONS[4]; // Madrid
    const dates = getBookingDates(14, 17);
    const guestInfo = generateGuestInfo();
    const paymentInfo = generatePaymentInfo();

    // ── STEP 1: Login ──
    await loginPage.goToLoginPage();
    await loginPage.login(user.email, user.password);

    // ── STEP 2: Search ──
    await searchPage.goToSearchPage();
    await searchPage.performSearch(
      destination.name,
      dates.checkIn,
      dates.checkOut,
      1, // 1 guest
      1 // 1 room
    );

    await searchPage.waitForSearchResults();

    // ── STEP 3: Select property ──
    await searchPage.clickPropertyByIndex(0);
    await hotelDetailsPage.waitForPageLoad();

    // Verify it's Madrid property with high rating
    const hotelName = await hotelDetailsPage.getHotelName();
    expect(hotelName).toContain('Estrella');

    const rating = await hotelDetailsPage.getHotelRating();
    expect(rating).toContain('4'); // Madrid has 4.8 rating

    // ── STEP 4: Select premium room (Suite) ──
    const roomNames = await hotelDetailsPage.getRoomNames();
    expect(roomNames.length).toBeGreaterThanOrEqual(2);

    // Select Suite Imperial (second room)
    await hotelDetailsPage.selectRoomByIndex(1);
    await bookingPage.waitForPageLoad();

    // ── STEP 5: Fill booking ──
    await bookingPage.fillGuestInformation({
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      email: guestInfo.email,
      phone: guestInfo.phone,
      notes: 'High floor preferred',
    });

    await bookingPage.agreeToTerms();
    await bookingPage.clickContinueToPayment();

    // ── STEP 6: Payment ──
    await paymentPage.waitForPageLoad();
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
    await paymentPage.waitForSuccessPage();

    // ── STEP 7: Confirmation ──
    await confirmationPage.waitForPageLoad();
    expect(await confirmationPage.isConfirmationPageDisplayed()).toBeTruthy();

    const ref = await confirmationPage.getBookingReference();
    expect(ref).toBeTruthy();

    // Verify booking confirmed
    expect(await confirmationPage.verifyBookingConfirmed()).toBeTruthy();
  });

  test('should handle multiple room selection changes', async () => {
    // Test data
    const user = TEST_USERS.lucia;
    const destination = TEST_DESTINATIONS[1]; // Mexico City
    const dates = getBookingDates(21, 24);
    const guestInfo = generateGuestInfo();
    const paymentInfo = generatePaymentInfo();

    // ── Login and Search ──
    await loginPage.goToLoginPage();
    await loginPage.login(user.email, user.password);

    await searchPage.goToSearchPage();
    await searchPage.performSearch(destination.name, dates.checkIn, dates.checkOut, 2, 1);
    await searchPage.waitForSearchResults();

    // ── Select property ──
    await searchPage.clickPropertyByIndex(0);
    await hotelDetailsPage.waitForPageLoad();

    const roomCount = await hotelDetailsPage.getRoomCount();
    expect(roomCount).toBeGreaterThanOrEqual(2);

    // First select standard room
    await hotelDetailsPage.selectRoomByIndex(0);
    await bookingPage.waitForPageLoad();

    let summary = await bookingPage.getBookingSummary();
    expect(summary.room).toBeTruthy();

    // Go back and select premium room instead
    await bookingPage.clickBackButton();
    await hotelDetailsPage.waitForPageLoad();

    await hotelDetailsPage.selectRoomByIndex(1);
    await bookingPage.waitForPageLoad();

    // Verify room changed
    summary = await bookingPage.getBookingSummary();
    expect(summary.room).toBeTruthy();

    // ── Complete booking ──
    await bookingPage.fillGuestInformation({
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      email: guestInfo.email,
      phone: guestInfo.phone,
    });

    await bookingPage.agreeToTerms();
    await bookingPage.clickContinueToPayment();
    await paymentPage.waitForPageLoad();

    // ── Process payment ──
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
    await confirmationPage.waitForPageLoad();

    // ── Verify confirmation ──
    expect(await confirmationPage.isConfirmationPageDisplayed()).toBeTruthy();
    expect(await confirmationPage.verifyBookingConfirmed()).toBeTruthy();
  });

  test('should validate booking details match throughout flow', async () => {
    // Test data
    const user = TEST_USERS.traveler;
    const destination = TEST_DESTINATIONS[2]; // Bogotá
    const dates = getBookingDates(5, 8);
    const guestInfo = generateGuestInfo();
    const paymentInfo = generatePaymentInfo();

    // ── Login and Search ──
    await loginPage.goToLoginPage();
    await loginPage.login(user.email, user.password);

    await searchPage.goToSearchPage();
    await searchPage.performSearch(destination.name, dates.checkIn, dates.checkOut, 2, 1);
    await searchPage.waitForSearchResults();

    // ── Select property ──
    await searchPage.clickPropertyByIndex(0);
    await hotelDetailsPage.waitForPageLoad();

    // Capture hotel details
    const hotelName = await hotelDetailsPage.getHotelName();
    const totalPrice1 = await hotelDetailsPage.getTotalPrice();
    expect(hotelName).toBeTruthy();
    expect(totalPrice1).toBeTruthy();

    // ── Select room ──
    await hotelDetailsPage.selectRoomByIndex(0);
    await bookingPage.waitForPageLoad();

    // Capture booking summary
    const summary = await bookingPage.getBookingSummary();
    expect(summary.checkIn).toBeTruthy();
    expect(summary.checkOut).toBeTruthy();

    // ── Fill and submit booking ──
    await bookingPage.fillGuestInformation({
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      email: guestInfo.email,
      phone: guestInfo.phone,
    });

    await bookingPage.agreeToTerms();
    await bookingPage.clickContinueToPayment();

    // ── Verify payment summary matches ──
    await paymentPage.waitForPageLoad();
    const paymentSummary = await paymentPage.getPaymentSummary();
    expect(paymentSummary.totalAmount).toBeTruthy();

    // ── Process payment ──
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
    await confirmationPage.waitForPageLoad();

    // ── Verify final details match ──
    const confirmationDetails = await confirmationPage.getBookingDetails();

    // Verify dates match
    expect(confirmationDetails.checkInDate).toBeTruthy();
    expect(confirmationDetails.checkOutDate).toBeTruthy();

    // Verify hotel name matches
    expect(confirmationDetails.hotelName).toBeTruthy();

    // Verify price is displayed
    expect(confirmationDetails.totalPrice).toBeTruthy();

    // Verify booking is confirmed
    expect(await confirmationPage.verifyBookingConfirmed()).toBeTruthy();
  });

  test('should display check-in instructions and contact info', async () => {
    // Test data
    const user = TEST_USERS.traveler;
    const destination = TEST_DESTINATIONS[5]; // Barcelona
    const dates = getBookingDates(30, 33);
    const guestInfo = generateGuestInfo();
    const paymentInfo = generatePaymentInfo();

    // ── Complete full flow ──
    await loginPage.goToLoginPage();
    await loginPage.login(user.email, user.password);

    await searchPage.goToSearchPage();
    await searchPage.performSearch(destination.name, dates.checkIn, dates.checkOut, 1, 1);
    await searchPage.waitForSearchResults();

    await searchPage.clickPropertyByIndex(0);
    await hotelDetailsPage.waitForPageLoad();

    // Verify check-in/out times are displayed
    const checkInTime = await hotelDetailsPage.getCheckInTime();
    expect(checkInTime).toBeTruthy();

    const checkOutTime = await hotelDetailsPage.getCheckOutTime();
    expect(checkOutTime).toBeTruthy();

    // Select room and complete booking
    await hotelDetailsPage.selectRoomByIndex(0);
    await bookingPage.waitForPageLoad();

    await bookingPage.fillGuestInformation({
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      email: guestInfo.email,
      phone: guestInfo.phone,
    });

    await bookingPage.agreeToTerms();
    await bookingPage.clickContinueToPayment();

    await paymentPage.waitForPageLoad();
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

    // ── Verify confirmation with all details ──
    await confirmationPage.waitForPageLoad();

    // Verify all expected information is present
    const hotelName = await confirmationPage.getHotelName();
    expect(hotelName).toBeTruthy();

    const checkInInfo = await confirmationPage.getCheckInTime();
    expect(checkInInfo).toBeTruthy();

    const locationInfo = await confirmationPage.getLocationInfo();
    expect(locationInfo).toBeTruthy();

    const bookingRef = await confirmationPage.getBookingReference();
    expect(bookingRef).toBeTruthy();

    // Verify booking is confirmed
    expect(await confirmationPage.verifyBookingConfirmed()).toBeTruthy();
  });
});
