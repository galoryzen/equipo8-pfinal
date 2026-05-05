import { Page } from '@playwright/test';

/**
 * Base Page Object class that provides common functionality
 * for all page objects in the E2E test suite
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a specific URL path
   */
  async goto(path: string) {
    await this.page.goto(path);
  }

  /**
   * Wait for a specific URL
   */
  async waitForURL(urlPattern: string | RegExp) {
    await this.page.waitForURL(urlPattern);
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation() {
    await this.page.waitForNavigation();
  }

  /**
   * Get the current URL
   */
  getCurrentURL() {
    return this.page.url();
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Fill input field
   */
  async fillInput(selector: string, value: string) {
    const input = this.page.locator(selector);
    await input.clear();
    await input.fill(value);
  }

  /**
   * Click element
   */
  async click(selector: string) {
    await this.page.click(selector);
  }

  /**
   * Click button by text
   */
  async clickButtonByText(text: string) {
    await this.page.getByRole('button', { name: text, exact: false }).click();
  }

  /**
   * Get text content
   */
  async getText(selector: string) {
    return await this.page.locator(selector).textContent();
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string) {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Check if element exists
   */
  async exists(selector: string) {
    return (await this.page.locator(selector).count()) > 0;
  }

  /**
   * Get all elements matching selector
   */
  async getElements(selector: string) {
    return this.page.locator(selector);
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete() {
    // Wait for any loading spinners to disappear
    const loadingSelectors = [
      'svg[class*="spinner"]',
      '[class*="loading"]',
      '[class*="progress"]',
      '.MuiCircularProgress-root',
    ];

    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'hidden', timeout: 2000 });
      } catch {
        // Selector might not exist on this page
      }
    }
  }

  /**
   * Get page title
   */
  async getTitle() {
    return this.page.title();
  }

  /**
   * Reload page
   */
  async reload() {
    await this.page.reload();
  }

  /**
   * Get all cookies
   */
  async getCookies() {
    return await this.page.context().cookies();
  }

  /**
   * Add cookies
   */
  async addCookie(cookies: Parameters<ReturnType<Page['context']>['addCookies']>[0]) {
    await this.page.context().addCookies(cookies);
  }

  /**
   * Clear local storage
   */
  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }

  /**
   * Get local storage item
   */
  async getLocalStorageItem(key: string) {
    return await this.page.evaluate((key) => localStorage.getItem(key), key);
  }

  /**
   * Set local storage item
   */
  async setLocalStorageItem(key: string, value: string) {
    await this.page.evaluate(
      ([storageKey, storageValue]) => {
        localStorage.setItem(storageKey, storageValue);
      },
      [key, value]
    );
  }

  /**
   * Wait for API response
   */
  async waitForAPIResponse(urlPattern: string | RegExp, timeout = 10000) {
    return await this.page.waitForResponse(
      (response) => {
        const urlString = response.url();
        if (typeof urlPattern === 'string') {
          return urlString.includes(urlPattern);
        }
        return urlPattern.test(urlString);
      },
      { timeout }
    );
  }

  /**
   * Wait for API request
   */
  async waitForAPIRequest(urlPattern: string | RegExp, timeout = 10000) {
    return await this.page.waitForRequest(
      (request) => {
        const urlString = request.url();
        if (typeof urlPattern === 'string') {
          return urlString.includes(urlPattern);
        }
        return urlPattern.test(urlString);
      },
      { timeout }
    );
  }
}
