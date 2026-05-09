import { BasePage } from './BasePage';

/**
 * Page Object for Confirmation/Check-in page
 * Handles confirmation details and check-in information
 */
export class ConfirmationPage extends BasePage {
  // Locators
  private readonly CONFIRMATION_HEADER = '[data-testid="traveler-confirmation-status-card"]';
  private readonly BOOKING_REFERENCE = '[data-testid="traveler-confirmation-booking-reference"]';
  private readonly BOOKING_DETAILS = '[data-testid="traveler-confirmation-details-card"]';
  private readonly HOTEL_NAME_DISPLAY = '[data-testid="traveler-confirmation-property-name"]';
  private readonly CHECK_IN_DATE = '[data-testid="traveler-confirmation-checkin"]';
  private readonly CHECK_OUT_DATE = '[data-testid="traveler-confirmation-checkin"]';
  private readonly ROOM_DISPLAY = '[data-testid="traveler-confirmation-room-name"]';
  private readonly GUESTS_DISPLAY = '[data-testid="traveler-confirmation-guests"]';
  private readonly TOTAL_PRICE_DISPLAY = '[data-testid="traveler-confirmation-total-price"]';
  private readonly CONFIRMATION_STATUS = '[data-testid="traveler-confirmation-status-chip"]';
  private readonly QR_CODE = '[class*="qr"], svg';
  private readonly DOWNLOAD_RECEIPT_BUTTON =
    'button:has-text("Descargar"), button:has-text("Download")';
  private readonly SHARE_BOOKING_BUTTON = 'button:has-text("Compartir"), button:has-text("Share")';
  private readonly VIEW_MY_TRIPS_BUTTON =
    'button:has-text("Mis viajes"), button:has-text("My trips")';
  private readonly BOOK_ANOTHER_BUTTON =
    'button:has-text("Otra reserva"), button:has-text("Book another")';
  private readonly PRINT_BUTTON = 'button:has-text("Imprimir"), button:has-text("Print")';
  private readonly CONTACT_SUPPORT_BUTTON =
    'button:has-text("Contactar"), button:has-text("Contact")';
  private readonly CONFIRMATION_MESSAGE = '[class*="message"], p';
  private readonly SPECIAL_INSTRUCTIONS = '[class*="instructions"], [class*="notes"]';
  private readonly CHECK_IN_TIME_INFO = 'text=/15:00|14:00|3:00 PM|2:00 PM/i';
  private readonly CHECK_OUT_TIME_INFO = 'text=/12:00|11:00|12:00 PM|11:00 AM/i';
  private readonly LOCATION_INFO =
    '[class*="location"], text=/Ubicación|Location|Dirección|Address/i';
  private readonly AMENITIES_LIST = '[class*="amenities"]';
  private readonly CANCELLATION_POLICY = '[class*="cancellation"], [class*="policy"]';
  private readonly SUCCESS_ICON = '[class*="success"], [class*="check"], svg';

  /**
   * Wait for confirmation page to load
   */
  async waitForPageLoad() {
    await this.waitForLoadingComplete();
    try {
      await this.waitForVisible(this.CONFIRMATION_HEADER, 10000);
    } catch {
      await this.waitForVisible(this.BOOKING_REFERENCE, 10000);
    }
  }

  /**
   * Verify confirmation page is displayed
   */
  async isConfirmationPageDisplayed(): Promise<boolean> {
    return (
      (await this.isVisible(this.CONFIRMATION_HEADER)) &&
      (await this.isVisible(this.BOOKING_DETAILS))
    );
  }

  /**
   * Get booking reference number
   */
  async getBookingReference(): Promise<string | null> {
    return await this.getText(this.BOOKING_REFERENCE);
  }

  /**
   * Get hotel name from confirmation
   */
  async getHotelName(): Promise<string | null> {
    return await this.getText(this.HOTEL_NAME_DISPLAY);
  }

  /**
   * Get check-in date from confirmation
   */
  async getCheckInDate(): Promise<string | null> {
    return await this.getText(this.CHECK_IN_DATE);
  }

  /**
   * Get check-out date from confirmation
   */
  async getCheckOutDate(): Promise<string | null> {
    return await this.getText(this.CHECK_OUT_DATE);
  }

  /**
   * Get room information from confirmation
   */
  async getRoomInfo(): Promise<string | null> {
    return await this.getText(this.ROOM_DISPLAY);
  }

  /**
   * Get guests information from confirmation
   */
  async getGuestsInfo(): Promise<string | null> {
    return await this.getText(this.GUESTS_DISPLAY);
  }

  /**
   * Get total price from confirmation
   */
  async getTotalPrice(): Promise<string | null> {
    return await this.getText(this.TOTAL_PRICE_DISPLAY);
  }

  /**
   * Get confirmation status
   */
  async getConfirmationStatus(): Promise<string | null> {
    return await this.getText(this.CONFIRMATION_STATUS);
  }

  /**
   * Get all booking details
   */
  async getBookingDetails() {
    return {
      reference: await this.getBookingReference(),
      hotelName: await this.getHotelName(),
      checkInDate: await this.getCheckInDate(),
      checkOutDate: await this.getCheckOutDate(),
      room: await this.getRoomInfo(),
      guests: await this.getGuestsInfo(),
      totalPrice: await this.getTotalPrice(),
      status: await this.getConfirmationStatus(),
    };
  }

  /**
   * Check if QR code is displayed
   */
  async isQRCodeDisplayed(): Promise<boolean> {
    return await this.isVisible(this.QR_CODE);
  }

  /**
   * Get check-in time
   */
  async getCheckInTime(): Promise<string | null> {
    return await this.getText(this.CHECK_IN_TIME_INFO);
  }

  /**
   * Get check-out time
   */
  async getCheckOutTime(): Promise<string | null> {
    return await this.getText(this.CHECK_OUT_TIME_INFO);
  }

  /**
   * Get location/address
   */
  async getLocationInfo(): Promise<string | null> {
    return await this.getText(this.LOCATION_INFO);
  }

  /**
   * Get special instructions
   */
  async getSpecialInstructions(): Promise<string | null> {
    return await this.getText(this.SPECIAL_INSTRUCTIONS);
  }

  /**
   * Get cancellation policy
   */
  async getCancellationPolicy(): Promise<string | null> {
    return await this.getText(this.CANCELLATION_POLICY);
  }

  /**
   * Click download receipt button
   */
  async clickDownloadReceipt() {
    await this.click(this.DOWNLOAD_RECEIPT_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Click share booking button
   */
  async clickShareBooking() {
    await this.click(this.SHARE_BOOKING_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Click view my trips button
   */
  async clickViewMyTrips() {
    await this.click(this.VIEW_MY_TRIPS_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Click book another button
   */
  async clickBookAnother() {
    await this.click(this.BOOK_ANOTHER_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Click print button
   */
  async clickPrint() {
    await this.click(this.PRINT_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Click contact support button
   */
  async clickContactSupport() {
    await this.click(this.CONTACT_SUPPORT_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Verify confirmation page elements
   */
  async verifyPageElements(): Promise<boolean> {
    return (
      (await this.isVisible(this.CONFIRMATION_HEADER)) &&
      (await this.isVisible(this.BOOKING_REFERENCE)) &&
      (await this.isVisible(this.BOOKING_DETAILS))
    );
  }

  /**
   * Get confirmation message
   */
  async getConfirmationMessage(): Promise<string | null> {
    return await this.getText(this.CONFIRMATION_MESSAGE);
  }

  /**
   * Check if success icon is displayed
   */
  async isSuccessIconDisplayed(): Promise<boolean> {
    return await this.isVisible(this.SUCCESS_ICON);
  }

  /**
   * Wait for check-in page to be accessible
   */
  async waitForCheckInPage() {
    // Can navigate to check-in using the booking reference
    const reference = await this.getBookingReference();
    if (reference) {
      await this.goto(`/traveler/my-trips/${reference}`);
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Scroll to see all confirmation details
   */
  async scrollToDetails() {
    await this.page.locator(this.BOOKING_DETAILS).first().scrollIntoViewIfNeeded();
  }

  /**
   * Get amenities from confirmation
   */
  async getAmenitiesList(): Promise<string[]> {
    const amenities: string[] = [];
    const amenityElements = this.page.locator(this.AMENITIES_LIST).locator('[class*="item"], li');
    const count = await amenityElements.count();

    for (let i = 0; i < count; i++) {
      const text = await amenityElements.nth(i).textContent();
      if (text) {
        amenities.push(text.trim());
      }
    }

    return amenities;
  }

  /**
   * Verify booking is in confirmed status
   */
  async verifyBookingConfirmed(): Promise<boolean> {
    const status = await this.getConfirmationStatus();
    return (
      status?.toLowerCase().includes('confirmada') ||
      status?.toLowerCase().includes('confirmed') ||
      (await this.isSuccessIconDisplayed())
    );
  }
}
