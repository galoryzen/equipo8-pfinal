import { BasePage } from './BasePage';

export class ManagerPage extends BasePage {
  private readonly NOTIFICATIONS_NAV_LINK =
    '[data-testid="manager.hotels.admin.navbar.notifications"]';
  private readonly BOOKING_CARD = '[data-testid="manager-booking-request-card"]';
  private readonly CONFIRM_BUTTON = '[data-testid="confirm-booking-button"]';
  private readonly PAGE_TITLE = 'h1';
  private readonly LOADING_SPINNER = '[class*="MuiCircularProgress"]';

  async goToManagerDashboard() {
    await this.goto('/manager');
    await this.waitForLoadingComplete();
  }

  async navigateToNotifications() {
    await this.click(this.NOTIFICATIONS_NAV_LINK);
    await this.waitForURL('/manager/notifications');
    await this.waitForLoadingComplete();
  }

  async waitForBookingCards(timeout = 10000) {
    await this.waitForVisible(this.BOOKING_CARD, timeout);
  }

  async getBookingCardsCount(): Promise<number> {
    return await this.page.locator(this.BOOKING_CARD).count();
  }

  async isBookingCardVisible(): Promise<boolean> {
    return await this.isVisible(this.BOOKING_CARD);
  }

  async confirmFirstBooking() {
    const firstCard = this.page.locator(this.BOOKING_CARD).first();
    const confirmBtn = firstCard.locator(this.CONFIRM_BUTTON);
    await confirmBtn.click();
    await this.waitForLoadingComplete();
  }

  async getFirstCardStatus(): Promise<string | null> {
    const firstCard = this.page.locator(this.BOOKING_CARD).first();
    const statusBadge = firstCard.locator('span[class*="bg-orange-100"]');
    if ((await statusBadge.count()) > 0) {
      return await statusBadge.textContent();
    }
    return null;
  }

  async getFirstCardPropertyName(): Promise<string | null> {
    const firstCard = this.page.locator(this.BOOKING_CARD).first();
    const title = firstCard.locator('h3');
    if ((await title.count()) > 0) {
      const text = await title.textContent();
      return text?.replace('Reservation Request: ', '') || null;
    }
    return null;
  }

  async getFirstCardGuestName(): Promise<string | null> {
    const firstCard = this.page.locator(this.BOOKING_CARD).first();
    const guestInfo = firstCard.locator('p').first();
    if ((await guestInfo.count()) > 0) {
      const text = await guestInfo.textContent();
      if (text) {
        const parts = text.split('·');
        return parts[0]?.trim() || null;
      }
    }
    return null;
  }

  async waitForPageLoad() {
    await this.waitForVisible(this.PAGE_TITLE, 10000);
    await this.waitForHidden(this.LOADING_SPINNER, 5000);
  }

  async isOnNotificationsPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/manager/notifications');
  }
}
