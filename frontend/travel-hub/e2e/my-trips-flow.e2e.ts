import { expect, test } from '@playwright/test';

import { TEST_USERS } from './fixtures/testData';
import { LoginPage } from './pages/LoginPage';
import { MyTripsPage } from './pages/MyTripsPage';

test.describe('E2E: Login & My Trips Flow', () => {
  let loginPage: LoginPage;
  let myTripsPage: MyTripsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    myTripsPage = new MyTripsPage(page);
  });

  test('user with no bookings sees empty state', async () => {
    const user = TEST_USERS.travelerNoBookings;

    await loginPage.goToLoginPage();
    await loginPage.login(user.email, user.password);
    await loginPage.waitForRedirect();

    await myTripsPage.goToMyTrips();
    await myTripsPage.waitForPageLoad();

    await expect(myTripsPage.getPage()).toHaveURL(/\/my-trips/);

    const emptyVisible = await myTripsPage.hasEmptyState();
    expect(emptyVisible).toBeTruthy();

    const count = await myTripsPage.getBookingCount();
    expect(count).toBe(0);
  });

  test('user with bookings sees list', async ({ page }) => {
    const user = TEST_USERS.traveler;

    await loginPage.goToLoginPage();
    await loginPage.login(user.email, user.password);
    await loginPage.waitForRedirect();

    await myTripsPage.goToMyTrips();
    await myTripsPage.waitForPageLoad();

    await expect(page).toHaveURL(/\/my-trips/);

    const emptyVisible = await myTripsPage.hasEmptyState();
    expect(emptyVisible).toBeFalsy();

    const cardCount = await myTripsPage.getBookingCount();
    expect(cardCount).toBeGreaterThan(0);
  });
});
