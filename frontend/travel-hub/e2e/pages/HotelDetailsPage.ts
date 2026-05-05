import { BasePage } from './BasePage';

/**
 * Page Object for Hotel Details page
 * Handles viewing hotel details, selecting rooms, and proceeding to booking
 */
export class HotelDetailsPage extends BasePage {
  // Locators
  private readonly HOTEL_NAME = '[data-testid="traveler-hotel-detail-view"] h1';
  private readonly HOTEL_RATING = '[class*="rating"], [class*="stars"]';
  private readonly HOTEL_PRICE = '[class*="price"], [class*="cost"]';
  private readonly HOTEL_DESCRIPTION = '[class*="description"]';
  private readonly AMENITIES_LIST = '[class*="amenities"], [class*="features"]';
  private readonly ROOM_CARD = '[data-testid^="traveler-room-card-"]';
  private readonly SELECT_ROOM_BUTTON = '[data-testid^="traveler-room-select-"]';
  private readonly ROOM_PRICE = '[class*="room-price"], [class*="price"]';
  private readonly ROOM_CAPACITY = '[class*="capacity"], [class*="guests"]';
  private readonly ROOM_AMENITIES = '[class*="room-amenities"], [class*="features"]';
  private readonly CONTINUE_BOOKING_BUTTON = '[data-testid="traveler-hotel-reserve-button"]';
  private readonly BACK_BUTTON = 'button:has-text("Atrás"), button:has-text("Back")';
  private readonly POLICY_SECTION = '[class*="policy"], [class*="policies"]';
  private readonly CHECK_IN_TIME = 'text=/check.?in|entrada/i';
  private readonly CHECK_OUT_TIME = 'text=/check.?out|salida/i';
  private readonly GALLERY_IMAGE = 'img[class*="gallery"], img[class*="image"]';
  private readonly LOADING_SPINNER =
    '[class*="spinner"], [class*="loading"], .MuiCircularProgress-root';

  /**
   * Wait for hotel details to load
   */
  async waitForPageLoad() {
    await this.waitForLoadingComplete();
    await this.waitForVisible('[data-testid="traveler-hotel-detail-view"]', 10000);
  }

  /**
   * Get hotel name
   */
  async getHotelName(): Promise<string | null> {
    return await this.getText(this.HOTEL_NAME);
  }

  /**
   * Get hotel rating
   */
  async getHotelRating(): Promise<string | null> {
    return await this.getText(this.HOTEL_RATING);
  }

  /**
   * Get hotel description
   */
  async getHotelDescription(): Promise<string | null> {
    return await this.getText(this.HOTEL_DESCRIPTION);
  }

  /**
   * Get number of rooms available for selection
   */
  async getRoomCount(): Promise<number> {
    return await this.page.locator(this.ROOM_CARD).count();
  }

  /**
   * Get room names/types
   */
  async getRoomNames(): Promise<string[]> {
    const rooms = this.page.locator(this.ROOM_CARD);
    const names: string[] = [];
    const count = await rooms.count();

    for (let i = 0; i < count; i++) {
      const name = await rooms
        .nth(i)
        .locator('[data-testid^="traveler-room-name-"]')
        .first()
        .textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }

  /**
   * Select room by index
   */
  async selectRoomByIndex(index: number = 0) {
    const rooms = this.page.locator(this.ROOM_CARD);
    const selectButton = rooms.nth(index).locator(this.SELECT_ROOM_BUTTON);
    await selectButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Select room by name
   */
  async selectRoomByName(roomName: string) {
    const roomCard = this.page.locator(this.ROOM_CARD).filter({ hasText: roomName }).first();
    const selectButton = roomCard.locator(this.SELECT_ROOM_BUTTON);
    await selectButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get room price
   */
  async getRoomPrice(index: number = 0): Promise<string | null> {
    return await this.page
      .locator(this.ROOM_CARD)
      .nth(index)
      .locator(this.ROOM_PRICE)
      .first()
      .textContent();
  }

  /**
   * Get room capacity
   */
  async getRoomCapacity(index: number = 0): Promise<string | null> {
    return await this.page
      .locator(this.ROOM_CARD)
      .nth(index)
      .locator(this.ROOM_CAPACITY)
      .first()
      .textContent();
  }

  /**
   * Get amenities list
   */
  async getAmenities(): Promise<string[]> {
    const amenities: string[] = [];
    const amenityElements = this.page.locator('[class*="amenity"], li');
    const count = await amenityElements.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await amenityElements.nth(i).textContent();
      if (text) {
        amenities.push(text.trim());
      }
    }

    return amenities;
  }

  /**
   * Scroll to room section
   */
  async scrollToRooms() {
    const roomsSection = this.page.locator(this.ROOM_CARD).first();
    await roomsSection.scrollIntoViewIfNeeded();
  }

  /**
   * Click continue/next button
   */
  async clickContinueButton() {
    await this.click(this.CONTINUE_BOOKING_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Click back button
   */
  async clickBackButton() {
    await this.click(this.BACK_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Verify hotel details page elements
   */
  async verifyPageElements(): Promise<boolean> {
    return (await this.isVisible(this.HOTEL_NAME)) && (await this.isVisible(this.ROOM_CARD));
  }

  /**
   * Get check-in time
   */
  async getCheckInTime(): Promise<string | null> {
    return await this.getText(this.CHECK_IN_TIME);
  }

  /**
   * Get check-out time
   */
  async getCheckOutTime(): Promise<string | null> {
    return await this.getText(this.CHECK_OUT_TIME);
  }

  /**
   * Scroll through gallery images
   */
  async scrollGallery(direction: 'left' | 'right' = 'right') {
    const gallery = this.page.locator('[class*="gallery"], [class*="carousel"]').first();
    const scrollAmount = direction === 'right' ? 300 : -300;
    await gallery.evaluate((el, amount) => {
      el.scrollBy({ left: amount, behavior: 'smooth' });
    }, scrollAmount);
  }

  /**
   * Check if room is available
   */
  async isRoomAvailable(index: number = 0): Promise<boolean> {
    const room = this.page.locator(this.ROOM_CARD).nth(index);
    const unavailableText = await room
      .locator('text=/no disponible|unavailable|sold out/i')
      .count();
    return unavailableText === 0;
  }

  /**
   * Wait for room selection redirect
   */
  async waitForRedirectToBooking() {
    await this.waitForURL(/booking|payment/);
  }

  /**
   * Get total price for selected room
   */
  async getTotalPrice(): Promise<string | null> {
    return await this.getText('[class*="total"], [class*="grand-total"]');
  }

  /**
   * Check if policies section is visible
   */
  async arePoliciesVisible(): Promise<boolean> {
    return await this.isVisible(this.POLICY_SECTION);
  }

  /**
   * Expand policies section if available
   */
  async expandPolicies() {
    const policyButton = this.page
      .locator(this.POLICY_SECTION)
      .locator('button, [role="button"]')
      .first();
    await policyButton.click();
    await this.waitForLoadingComplete();
  }
}
