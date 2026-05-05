import { BasePage } from './BasePage';

/**
 * Page Object for Payment Confirmation page (/traveler/payment/confirmation)
 * Displays the "Reservation Pending" status after payment submission
 */
export class PaymentConfirmationPage extends BasePage {
  // Locators
  private readonly STATUS_CARD = '[data-testid="traveler-confirmation-status-card"]';
  private readonly STATUS_ICON = '[data-testid="traveler-confirmation-status-icon"]';
  private readonly BOOKING_REFERENCE = '[data-testid="traveler-confirmation-booking-reference"]';
  private readonly DETAILS_CARD = '[data-testid="traveler-confirmation-details-card"]';
  private readonly PROPERTY_NAME = '[data-testid="traveler-confirmation-property-name"]';
  private readonly CHECKIN = '[data-testid="traveler-confirmation-checkin"]';
  private readonly ROOM_NAME = '[data-testid="traveler-confirmation-room-name"]';
  private readonly GUESTS = '[data-testid="traveler-confirmation-guests"]';
  private readonly TOTAL_PRICE = '[data-testid="traveler-confirmation-total-price"]';
  private readonly STATUS_CHIP = '[data-testid="traveler-confirmation-status-chip"]';
  private readonly IMAGE = '[data-testid="traveler-confirmation-image"]';
  private readonly VIEW_MY_TRIPS_BUTTON =
    'button:has-text("View My Trips"), button:has-text("Mis viajes")';
  private readonly EXPLORE_MORE_BUTTON =
    'button:has-text("Explore More"), button:has-text("Explorar más")';

  /**
   * Wait for payment confirmation page to load
   */
  async waitForPageLoad() {
    await this.waitForLoadingComplete();
    await this.waitForVisible(this.STATUS_CARD, 10000);
  }

  /**
   * Check if payment confirmation page is displayed
   */
  async isPageDisplayed(): Promise<boolean> {
    return (await this.isVisible(this.STATUS_CARD)) && (await this.isVisible(this.DETAILS_CARD));
  }

  /**
   * Get booking reference number
   */
  async getBookingReference(): Promise<string | null> {
    return await this.getText(this.BOOKING_REFERENCE);
  }

  /**
   * Get property/hotel name
   */
  async getPropertyName(): Promise<string | null> {
    return await this.getText(this.PROPERTY_NAME);
  }

  /**
   * Get check-in date text
   */
  async getCheckinDate(): Promise<string | null> {
    return await this.getText(this.CHECKIN);
  }

  /**
   * Get room name
   */
  async getRoomName(): Promise<string | null> {
    return await this.getText(this.ROOM_NAME);
  }

  /**
   * Get guests text
   */
  async getGuests(): Promise<string | null> {
    return await this.getText(this.GUESTS);
  }

  /**
   * Get total price text
   */
  async getTotalPrice(): Promise<string | null> {
    return await this.getText(this.TOTAL_PRICE);
  }

  /**
   * Get status chip text
   */
  async getStatus(): Promise<string | null> {
    return await this.getText(this.STATUS_CHIP);
  }

  /**
   * Get all confirmation details
   */
  async getConfirmationSummary() {
    return {
      bookingReference: await this.getBookingReference(),
      propertyName: await this.getPropertyName(),
      checkinDate: await this.getCheckinDate(),
      roomName: await this.getRoomName(),
      guests: await this.getGuests(),
      totalPrice: await this.getTotalPrice(),
      status: await this.getStatus(),
    };
  }

  /**
   * Click "View My Trips" button
   */
  async clickViewMyTrips() {
    await this.click(this.VIEW_MY_TRIPS_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Click "Explore More" button
   */
  async clickExploreMore() {
    await this.click(this.EXPLORE_MORE_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Check if property image is displayed
   */
  async hasImage(): Promise<boolean> {
    return await this.isVisible(this.IMAGE);
  }

  /**
   * Check if status icon is displayed
   */
  async hasStatusIcon(): Promise<boolean> {
    return await this.isVisible(this.STATUS_ICON);
  }
}
