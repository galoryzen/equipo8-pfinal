import { BasePage } from './BasePage';

export class SearchPage extends BasePage {
  private readonly SEARCH_DESTINATION_INPUT = '[data-testid="traveler-search-destination-input"]';
  private readonly SEARCH_DATES_TRIGGER = '[data-testid="traveler-search-dates-trigger"]';
  private readonly DATES_POPOVER = '[data-testid="traveler-search-dates-popover"]';
  private readonly CHECK_IN_INPUT = '[data-testid="traveler-search-checkin-input"]';
  private readonly CHECK_OUT_INPUT = '[data-testid="traveler-search-checkout-input"]';
  private readonly GUESTS_POPOVER = '[data-testid="traveler-search-guests-trigger"]';
  private readonly GUESTS_INPUT = '[data-testid="traveler-select-guests-input"]';
  private readonly SEARCH_BUTTON = '[data-testid="traveler-search-submit-icon"]';
  private readonly DESTINATION_OPTION = '[class*="option"], [role="option"]';
  private readonly PROPERTY_CARD = '[data-testid^="traveler-property-card-"]';
  private readonly LOADING_SPINNER =
    '[class*="spinner"], [class*="loading"], .MuiCircularProgress-root';

  async goToSearchPage() {
    await this.goto('/traveler/search');
    await this.waitForLoadingComplete();
  }

  async searchDestination(destination: string) {
    await this.fillInput(this.SEARCH_DESTINATION_INPUT, destination);
    await this.page.waitForSelector(this.DESTINATION_OPTION, { state: 'visible', timeout: 10000 });
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingComplete();
  }

  async openDatePicker() {
    await this.click(this.SEARCH_DATES_TRIGGER);
    await this.page.waitForSelector(this.DATES_POPOVER, { state: 'visible', timeout: 5000 });
  }

  async closeDatePicker() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector(this.DATES_POPOVER, { state: 'hidden', timeout: 5000 });
  }

  async openGuestsPicker() {
    await this.click(this.GUESTS_POPOVER);
    await this.page.waitForSelector(this.GUESTS_POPOVER, { state: 'visible', timeout: 5000 });
  }

  async closeGuestsPicker() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector(this.GUESTS_POPOVER, { state: 'hidden', timeout: 5000 });
  }

  private formatDate(dateString: string): string {
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  }

  async setCheckInDate(date: string) {
    const checkInInput = this.page.locator(this.DATES_POPOVER).locator(this.CHECK_IN_INPUT);
    await checkInInput.pressSequentially(this.formatDate(date));
  }

  async setCheckOutDate(date: string) {
    const checkOutInput = this.page.locator(this.DATES_POPOVER).locator(this.CHECK_OUT_INPUT);
    await checkOutInput.pressSequentially(this.formatDate(date));
  }

  async setGuests(count: number) {
    await this.fillInput(this.GUESTS_INPUT, count.toString());
    await this.page.keyboard.press('Escape');
  }

  async setRooms(count: number) {
    void count;
  }

  async clickSearchButton() {
    await this.click(this.SEARCH_BUTTON);
    await this.waitForLoadingComplete();
  }

  async performSearch(destination: string, checkIn: string, checkOut: string, guests: number = 1) {
    await this.searchDestination(destination);
    await this.openDatePicker();
    await this.setCheckInDate(checkIn);
    await this.setCheckOutDate(checkOut);
    await this.closeDatePicker();
    await this.openGuestsPicker();
    await this.setGuests(guests);
    await this.clickSearchButton();
  }

  async getPropertyCount(): Promise<number> {
    return await this.page.locator(this.PROPERTY_CARD).count();
  }

  async clickPropertyByIndex(index: number = 0) {
    const properties = this.page.locator(this.PROPERTY_CARD);
    await properties.nth(index).waitFor({ state: 'visible', timeout: 10000 });
    await properties.nth(index).click();
    await this.waitForLoadingComplete();
  }

  async clickPropertyByName(name: string) {
    await this.page.locator(this.PROPERTY_CARD).filter({ hasText: name }).first().click();
    await this.waitForLoadingComplete();
  }

  async waitForSearchResults() {
    try {
      await this.page.waitForSelector(this.LOADING_SPINNER, { state: 'hidden', timeout: 15000 });
    } catch {}
    await this.waitForVisible(this.PROPERTY_CARD, 15000);
  }

  async arePropertiesDisplayed(): Promise<boolean> {
    return (await this.getPropertyCount()) > 0;
  }

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

  async selectCity(cityName: string) {
    const cityChip = this.page.locator(
      `button:has-text("${cityName}"), div:has-text("${cityName}")`
    );
    await cityChip.first().click();
    await this.waitForLoadingComplete();
  }

  async waitForPageLoad() {
    await this.waitForVisible(this.SEARCH_DESTINATION_INPUT, 10000);
  }

  async verifyPageElements(): Promise<boolean> {
    return (
      (await this.isVisible(this.SEARCH_DESTINATION_INPUT)) &&
      (await this.isVisible(this.SEARCH_BUTTON))
    );
  }

  async clearSearchInputs() {
    await this.page.locator(this.SEARCH_DESTINATION_INPUT).first().clear();
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  getDateDaysFromNow(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}
