import { Page } from '@playwright/test';

/**
 * E2E Test Utilities and Helpers
 * Common functions used across test suites
 */

/**
 * Wait for application to be fully loaded
 */
export async function waitForAppReady(page: Page, timeout = 10000) {
  // Wait for initial page load
  await page.waitForLoadState('networkidle', { timeout });

  // Wait for any initial loading spinners to disappear
  const spinnerSelectors = [
    '.MuiCircularProgress-root',
    '[class*="spinner"]',
    '[class*="loading"]',
  ];

  for (const selector of spinnerSelectors) {
    try {
      await page.waitForSelector(selector, { state: 'hidden', timeout: 2000 });
    } catch {
      // Selector might not exist on this page
    }
  }
}

/**
 * Check if element contains specific text
 */
export async function elementContainsText(
  page: Page,
  selector: string,
  text: string
): Promise<boolean> {
  const locator = page.locator(selector);
  const textContent = await locator.textContent();
  return textContent?.includes(text) ?? false;
}

/**
 * Get all text from multiple elements
 */
export async function getAllElementsText(page: Page, selector: string): Promise<string[]> {
  const locator = page.locator(selector);
  const count = await locator.count();
  const texts: string[] = [];

  for (let i = 0; i < count; i++) {
    const text = await locator.nth(i).textContent();
    if (text) {
      texts.push(text.trim());
    }
  }

  return texts;
}

/**
 * Extract number from text (e.g., "$100.00" -> 100)
 */
export function extractNumberFromText(text: string): number {
  const matches = text.match(/\d+(\.\d{2})?/);
  return matches ? parseFloat(matches[0]) : 0;
}

/**
 * Extract date from text
 */
export function extractDateFromText(text: string): Date | null {
  // Try various date formats
  const patterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/, // Month DD, YYYY
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      try {
        return new Date(matches[0]);
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Compare dates (ignoring time)
 */
export function areSameDates(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Calculate days between two dates
 */
export function daysBetweenDates(startDate: Date, endDate: Date): number {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Format date to string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to Spanish format (DD/MM/YYYY)
 */
export function formatDateES(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Basic validation - at least 7 digits
  const phoneRegex = /\d{7,}/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Validate credit card number (Luhn algorithm)
 */
export function isValidCreditCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate CVV format
 */
export function isValidCVV(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv.replace(/\s/g, ''));
}

/**
 * Validate expiry date format (MM/YY)
 */
export function isValidExpiryDate(expiryDate: string): boolean {
  const pattern = /^(0[1-9]|1[0-2])\/\d{2}$/;
  return pattern.test(expiryDate);
}

/**
 * Validate postal code
 */
export function isValidPostalCode(postalCode: string): boolean {
  // Basic validation - at least 3 alphanumeric characters
  return /^[a-zA-Z0-9\s-]{3,}$/.test(postalCode);
}

/**
 * Get random element from array
 */
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Delay execution
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  initialDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(
  page: Page,
  name: string,
  directory = './screenshots'
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${directory}/${name}-${timestamp}.png`;

  try {
    await page.screenshot({ path: filename, fullPage: true });
  } catch {
    // Directory might not exist, skip screenshot
  }
}

/**
 * Log to file
 */
export async function logToFile(message: string, filename = './test-logs.txt'): Promise<void> {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  try {
    const fs = await import('fs').then((m) => m.promises);
    await fs.appendFile(filename, logMessage, 'utf-8');
  } catch {
    // Logging failed, continue
  }
}

/**
 * Get browser context and clear cookies/storage
 */
export async function clearBrowserData(page: Page): Promise<void> {
  const context = page.context();

  // Clear cookies
  const cookies = await context.cookies();
  if (cookies.length > 0) {
    await context.clearCookies();
  }

  // Clear local storage
  await page.evaluate(() => localStorage.clear());

  // Clear session storage
  await page.evaluate(() => sessionStorage.clear());
}

/**
 * Set authentication token in storage
 */
export async function setAuthToken(
  page: Page,
  token: string,
  storageKey = 'auth_token'
): Promise<void> {
  await page.evaluate(
    (key, value) => {
      localStorage.setItem(key, value);
    },
    storageKey,
    token
  );
}

/**
 * Get authentication token from storage
 */
export async function getAuthToken(page: Page, storageKey = 'auth_token'): Promise<string | null> {
  return await page.evaluate((key) => localStorage.getItem(key), storageKey);
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }, selector);
}

/**
 * Scroll element into view and wait
 */
export async function scrollIntoViewAndWait(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();

  // Wait for element to be in viewport
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await isInViewport(page, selector)) {
      break;
    }
    await delay(100);
  }
}

/**
 * Get all attribute values from elements
 */
export async function getAllAttributeValues(
  page: Page,
  selector: string,
  attribute: string
): Promise<string[]> {
  return await page.evaluate(
    (sel, attr) => {
      const elements = document.querySelectorAll(sel);
      return Array.from(elements)
        .map((el) => el.getAttribute(attr))
        .filter((val) => val !== null) as string[];
    },
    selector,
    attribute
  );
}

/**
 * Check if element is disabled
 */
export async function isDisabled(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;

    return (element as HTMLButtonElement | HTMLInputElement).disabled;
  }, selector);
}

/**
 * Count occurrences of text on page
 */
export async function countTextOccurrences(page: Page, text: string): Promise<number> {
  return await page.evaluate((searchText) => {
    const bodyText = document.body.innerText;
    const regex = new RegExp(searchText, 'gi');
    const matches = bodyText.match(regex);
    return matches ? matches.length : 0;
  }, text);
}

/**
 * Assert text is present on page
 */
export async function assertTextPresent(page: Page, text: string): Promise<boolean> {
  const count = await countTextOccurrences(page, text);
  return count > 0;
}

/**
 * Wait for text to appear on page
 */
export async function waitForTextPresent(page: Page, text: string, timeout = 5000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await assertTextPresent(page, text)) {
      return;
    }
    await delay(100);
  }

  throw new Error(`Text "${text}" not found on page after ${timeout}ms`);
}
