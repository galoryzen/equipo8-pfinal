import { expect, test } from '@playwright/test';

import { TEST_USERS } from './fixtures/testData';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { ManagerLoginPage } from './pages/ManagerLoginPage';

test.describe('E2E: Manager Dashboard & Booking Flow', () => {
  let loginPage: ManagerLoginPage;
  let dashboardPage: ManagerDashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new ManagerLoginPage(page);
    dashboardPage = new ManagerDashboardPage(page);
  });

  test('Roberto dashboard loads with non-zero metrics', async ({ page }) => {
    const user = TEST_USERS.roberto;

    await loginPage.goToLoginPage();
    await loginPage.login(user.email, user.password);
    await loginPage.waitForRedirect();

    await dashboardPage.goToDashboard();
    await dashboardPage.waitForPageLoad();

    await expect(page).toHaveURL(/\/manager/);

    const cardCount = await dashboardPage.getMetricCardCount();
    expect(cardCount).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < cardCount; i++) {
      expect(await dashboardPage.isMetricCardVisible(i)).toBeTruthy();
    }

    const revenueCard = dashboardPage
      .getPage()
      .locator('[data-testid="manager-metric-card"]')
      .nth(1);
    const revenueText = await revenueCard.locator('[class*="MuiTypography-h4"]').textContent();
    expect(revenueText).not.toBe('$0.00');

    expect(await dashboardPage.isTrendsCardVisible()).toBeTruthy();
    expect(await dashboardPage.isCheckinsTableVisible()).toBeTruthy();

    await dashboardPage.changeDateFilter('last30');
    await dashboardPage.waitForPageLoad();
  });
});
