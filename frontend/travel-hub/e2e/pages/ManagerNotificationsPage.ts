import { BasePage } from './BasePage';

export class ManagerNotificationsPage extends BasePage {
  private readonly TITLE = '[data-testid="manager-notifications-title"]';
  private readonly BOOKING_CARDS = '[data-testid="manager-booking-request-card"]';
  private readonly CONFIRM_BUTTON = '[data-testid="confirm-booking-button"]';
  private readonly EMPTY_STATE = '[data-testid="manager-no-pending-bookings"]';
  private readonly PAGINATION_PREV = '[data-testid="manager-pagination-prev"]';
  private readonly PAGINATION_NEXT = '[data-testid="manager-pagination-next"]';
  private readonly SNACKBAR = '[data-testid="manager-snackbar"]';

  async waitForPageLoad() {
    await this.waitForVisible(this.TITLE, 10000);
    await this.waitForHidden('[class*="MuiCircularProgress"]', 8000);
  }

  async getBookingCardCount(): Promise<number> {
    return this.page.locator(this.BOOKING_CARDS).count();
  }

  async hasEmptyState(): Promise<boolean> {
    return this.isVisible(this.EMPTY_STATE);
  }

  async confirmFirstBooking(): Promise<number> {
    const countBefore = await this.getBookingCardCount();
    await this.page.locator(this.CONFIRM_BUTTON).first().click();
    await this.waitForLoadingComplete();
    return countBefore;
  }

  async snackbarAppears(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.SNACKBAR, { state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async dismissSnackbar() {
    await this.page.keyboard.press('Escape');
    await this.waitForLoadingComplete();
  }

  async navigateToNextPage(): Promise<boolean> {
    const nextBtn = this.page.locator(this.PAGINATION_NEXT);
    const isDisabled = await nextBtn.isDisabled();
    if (isDisabled) return false;
    await nextBtn.click();
    await this.waitForLoadingComplete();
    return true;
  }
}
