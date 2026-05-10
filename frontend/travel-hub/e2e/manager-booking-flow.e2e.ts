import { expect, test } from '@playwright/test';

import { TEST_USERS } from './fixtures/testData';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { ManagerLoginPage } from './pages/ManagerLoginPage';
import { ManagerNotificationsPage } from './pages/ManagerNotificationsPage';

test.describe('E2E: Manager Dashboard & Booking Flow', () => {
  let loginPage: ManagerLoginPage;
  let dashboardPage: ManagerDashboardPage;
  let notificationsPage: ManagerNotificationsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new ManagerLoginPage(page);
    dashboardPage = new ManagerDashboardPage(page);
    notificationsPage = new ManagerNotificationsPage(page);
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

  test('Roberto confirms a pending booking', async ({ page }) => {
    const user = TEST_USERS.roberto;

    await loginPage.goToLoginPage();
    await loginPage.login(user.email, user.password);
    await loginPage.waitForRedirect();

    await dashboardPage.navigateToNotifications();
    await notificationsPage.waitForPageLoad();

    await expect(page).toHaveURL(/\/manager\/notifications/);

    const countBefore = await notificationsPage.getBookingCardCount();
    expect(countBefore).toBeGreaterThan(0);

    await notificationsPage.confirmFirstBooking();

    const hasSnackbar = await notificationsPage.snackbarAppears();
    expect(hasSnackbar).toBeTruthy();

    await notificationsPage.dismissSnackbar();

    const countAfter = await notificationsPage.getBookingCardCount();
    expect(countAfter).toBeLessThanOrEqual(countBefore);
  });

  test('Javier sees empty notifications state', async ({ page }) => {
    const user = TEST_USERS.javier;

    await loginPage.goToLoginPage();
    await loginPage.login(user.email, user.password);
    await loginPage.waitForRedirect();

    await dashboardPage.navigateToNotifications();
    await notificationsPage.waitForPageLoad();

    await expect(page).toHaveURL(/\/manager\/notifications/);

    const emptyVisible = await notificationsPage.hasEmptyState();
    expect(emptyVisible).toBeTruthy();

    const count = await notificationsPage.getBookingCardCount();
    expect(count).toBe(0);
  });
});
