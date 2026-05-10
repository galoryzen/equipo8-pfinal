import { BasePage } from './BasePage';

export class MyTripsPage extends BasePage {
  private readonly BOOKING_CARDS = '[data-testid="booking-card"]';
  private readonly EMPTY_STATE = '[data-testid="trips-empty-state"]';

  async goToMyTrips() {
    await this.goto('/traveler/my-trips');
    await this.waitForLoadingComplete();
  }

  async waitForPageLoad() {
    const tabSelector = '[role="tab"]';

    try {
      await Promise.race([
        this.page.waitForSelector(tabSelector, { state: 'visible', timeout: 10000 }),
        this.page.waitForSelector(this.EMPTY_STATE, { state: 'visible', timeout: 10000 }),
      ]);
    } catch (error: unknown) {
      console.warn('Neither selector appeared within timeout')
      console.error(error);
      // Continue anyway or throw if this is critical
    }

    await this.page.keyboard.press('Escape');
    await this.waitForLoadingComplete();
  }

  async isPageDisplayed(shouldBeEmpty: boolean = false): Promise<boolean> {
    if (shouldBeEmpty) {
      return this.exists(this.EMPTY_STATE);
    }
    return this.exists('[role="tab"]');
  }

  async hasEmptyState(): Promise<boolean> {
    return this.isVisible(this.EMPTY_STATE);
  }

  async getBookingCount(): Promise<number> {
    return this.page.locator(this.BOOKING_CARDS).count();
  }

  async clickFindHotel() {
    await this.goto('/traveler/search');
    await this.waitForLoadingComplete();
  }
}
