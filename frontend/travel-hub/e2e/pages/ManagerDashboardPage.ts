import { BasePage } from './BasePage';

export class ManagerDashboardPage extends BasePage {
  private readonly TITLE = '[data-testid="manager-dashboard-title"]';
  private readonly METRIC_CARDS = '[data-testid="manager-metric-card"]';
  private readonly DATE_FILTER = '#manager-dashboard-date-range';
  private readonly TRENDS_CARD = '[data-testid="manager-booking-trends-card"]';
  private readonly CHECKINS_TABLE = '[data-testid="manager-upcoming-checkins-table"]';
  private readonly NOTIFICATIONS_NAV = '[data-testid="manager.hotels.admin.navbar.notifications"]';

  async goToDashboard() {
    await this.goto('/manager');
    await this.waitForLoadingComplete();
  }

  async waitForPageLoad() {
    await this.waitForVisible(this.TITLE, 10000);
    await this.waitForHidden('[class*="MuiCircularProgress"]', 8000);
  }

  async getMetricCardCount(): Promise<number> {
    return this.page.locator(this.METRIC_CARDS).count();
  }

  async isMetricCardVisible(index = 0): Promise<boolean> {
    return this.page.locator(this.METRIC_CARDS).nth(index).isVisible();
  }

  async getMetricValue(index = 0): Promise<string | null> {
    const card = this.page.locator(this.METRIC_CARDS).nth(index);
    return card.locator('[class*="MuiTypography-h4"]').textContent();
  }

  async isRevenueNonZero(): Promise<boolean> {
    const cards = await this.page.locator(this.METRIC_CARDS).all();
    for (const card of cards) {
      const text = await card.locator('[class*="MuiTypography-h4"]').textContent();
      if (text && text.includes('$') && !text.includes('$0.00')) {
        return true;
      }
    }
    return false;
  }

  async isTrendsCardVisible(): Promise<boolean> {
    return this.isVisible(this.TRENDS_CARD);
  }

  async isCheckinsTableVisible(): Promise<boolean> {
    return this.isVisible(this.CHECKINS_TABLE);
  }

  async changeDateFilter(option: 'last7' | 'last30' | 'currentMonth') {
    await this.page.locator(this.DATE_FILTER).click();
    await this.page
      .getByRole('option', {
        name: new RegExp(
          option === 'last7' ? 'Last 7' : option === 'last30' ? 'Last 30' : 'Current Month',
          'i'
        ),
      })
      .click();
    await this.waitForLoadingComplete();
  }

  async navigateToNotifications() {
    await this.click(this.NOTIFICATIONS_NAV);
    await this.waitForURL('/manager/notifications');
    await this.waitForLoadingComplete();
  }
}
