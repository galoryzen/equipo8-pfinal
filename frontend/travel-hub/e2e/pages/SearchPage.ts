import { BasePage } from './BasePage';

/**
 * Page Object for the Search/Home page
 * Handles searching for properties and selecting destinations
 */
export class SearchPage extends BasePage {
  // Locators
  private readonly SEARCH_DESTINATION_INPUT = '[data-testid="traveler-search-destination-input"]';
  private readonly CHECK_IN_INPUT = '[data-testid="traveler-search-checkin-input"]';
  private readonly CHECK_OUT_INPUT = '[data-testid="traveler-search-checkout-input"]';
  private readonly GUESTS_INPUT = '[data-testid="traveler-search-guests-input"]';
  private readonly SEARCH_BUTTON = '[data-testid="traveler-search-submit"]';
  private readonly DESTINATION_OPTION = '[class*="option"], [role="option"]';
  private readonly PROPERTY_CARD = '[data-testid^="traveler-property-card-"]';
  private readonly CITY_SELECTOR = 'button[class*="chip"], div[class*="chip"]';
  private readonly LOADING_SPINNER =
    '[class*="spinner"], [class*="loading"], .MuiCircularProgress-root';

  /**
   * Navigate to search/home page
   */
  async goToSearchPage() {
    await this.goto('/traveler/search');
    await this.waitForLoadingComplete();
  }

  /**
   * Search for a destination
   */
  async searchDestination(destination: string) {
    await this.fillInput(this.SEARCH_DESTINATION_INPUT, destination);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingComplete();
  }

  /**
   * Set check-in date
   */
  async setCheckInDate(date: string) {
    // Date format: YYYY-MM-DD
    const checkInLocator = this.page.locator(this.CHECK_IN_INPUT).first();
    await checkInLocator.clear();
    await checkInLocator.fill(date);
  }

  /**
   * Set check-out date
   */
  async setCheckOutDate(date: string) {
    // Date format: YYYY-MM-DD
    const checkOutLocator = this.page.locator(this.CHECK_OUT_INPUT).last();
    await checkOutLocator.clear();
    await checkOutLocator.fill(date);
  }

  /**
   * Set number of guests
   */
  async setGuests(count: number) {
    await this.fillInput(this.GUESTS_INPUT, count.toString());
  }

  /**
   * Set number of rooms
   */
  async setRooms(count: number) {
    // The current traveler search UI does not expose a room-count control.
    // Keep the method for suite compatibility, but make it a no-op.
    void count;
  }

  /**
   * Click search button
   */
  async clickSearchButton() {
    await this.click(this.SEARCH_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Perform full search with all parameters
   */
  async performSearch(
    destination: string,
    checkIn: string,
    checkOut: string,
    guests: number = 1,
    rooms: number = 1
  ) {
    await this.searchDestination(destination);
    await this.setCheckInDate(checkIn);
    await this.setCheckOutDate(checkOut);
    await this.setGuests(guests);
    await this.setRooms(rooms);
    await this.clickSearchButton();
  }

  /**
   * Get number of properties displayed
   */
  async getPropertyCount(): Promise<number> {
    return await this.page.locator(this.PROPERTY_CARD).count();
  }

  /**
   * Click on a property by index
   */
  async clickPropertyByIndex(index: number = 0) {
    const properties = this.page.locator(this.PROPERTY_CARD);
    await properties.nth(index).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click on a property by name
   */
  async clickPropertyByName(name: string) {
    await this.page.locator(this.PROPERTY_CARD).filter({ hasText: name }).first().click();
    await this.waitForLoadingComplete();
  }

  /**
   * Wait for search results to load
   */
  async waitForSearchResults() {
    await this.waitForVisible(this.PROPERTY_CARD, 10000);
  }

  /**
   * Check if properties are displayed
   */
  async arePropertiesDisplayed(): Promise<boolean> {
    return (await this.getPropertyCount()) > 0;
  }

  /**
   * Get property names
   */
  async getPropertyNames(): Promise<string[]> {
    const properties = this.page.locator(this.PROPERTY_CARD);
    const names: string[] = [];
    const count = await properties.count();

    for (let i = 0; i < count; i++) {
      const name = await properties
        .nth(i)
        .locator('[data-testid^="traveler-property-name-"]')
        .first()
        .textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }

  /**
   * Filter by city/destination (using chipsselector if available)
   */
  async selectCity(cityName: string) {
    const cityChip = this.page.locator(
      `button:has-text("${cityName}"), div:has-text("${cityName}")`
    );
    await cityChip.first().click();
    await this.waitForLoadingComplete();
  }

  /**
   * Wait for page load
   */
  async waitForPageLoad() {
    await this.waitForVisible(this.SEARCH_DESTINATION_INPUT, 10000);
  }

  /**
   * Verify search page elements are present
   */
  async verifyPageElements(): Promise<boolean> {
    return (
      (await this.isVisible(this.SEARCH_DESTINATION_INPUT)) &&
      (await this.isVisible(this.SEARCH_BUTTON))
    );
  }

  /**
   * Clear search inputs
   */
  async clearSearchInputs() {
    await this.page.locator(this.SEARCH_DESTINATION_INPUT).first().clear();
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Get date X days from now in YYYY-MM-DD format
   */
  getDateDaysFromNow(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}
