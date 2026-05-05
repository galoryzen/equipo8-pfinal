import { BasePage } from './BasePage';

/**
 * Page Object for Payment page
 * Handles payment information and processing
 */
export class PaymentPage extends BasePage {
  // Locators
  private readonly PAYMENT_METHOD_SELECT = '[data-testid="traveler-payment-method-tabs"]';
  private readonly CARD_NUMBER_INPUT = '[data-testid="traveler-payment-card-number"]';
  private readonly CARDHOLDER_NAME_INPUT = '[data-testid="traveler-payment-card-name"]';
  private readonly EXPIRY_DATE_INPUT = '[data-testid="traveler-payment-card-expiry"]';
  private readonly CVV_INPUT = '[data-testid="traveler-payment-card-cvv"]';
  private readonly BILLING_ADDRESS_INPUT =
    'input[placeholder*="Dirección"], input[placeholder*="Address"]';
  private readonly BILLING_CITY_INPUT = 'input[placeholder*="Ciudad"], input[placeholder*="City"]';
  private readonly BILLING_STATE_INPUT =
    'input[placeholder*="Estado"], input[placeholder*="State"], input[placeholder*="Provincia"]';
  private readonly BILLING_ZIP_INPUT =
    'input[placeholder*="Código postal"], input[placeholder*="ZIP"], input[placeholder*="CP"]';
  private readonly BILLING_COUNTRY_INPUT = 'input[placeholder*="País"], select';
  private readonly SAME_AS_SHIPPING_CHECKBOX = 'input[type="checkbox"]';
  private readonly PAY_NOW_BUTTON = '[data-testid="traveler-payment-submit"]';
  private readonly CONFIRM_PAYMENT_BUTTON =
    'button:has-text("Confirmar"), button:has-text("Confirm")';
  private readonly BACK_BUTTON = 'button:has-text("Atrás"), button:has-text("Back")';
  private readonly PAYMENT_SUMMARY = '[data-testid="traveler-payment-method-card"]';
  private readonly TOTAL_AMOUNT = '[data-testid="traveler-payment-submit"]';
  private readonly ORDER_ID = '[class*="order-id"], text=/Order|Pedido/i';
  private readonly BOOKING_REFERENCE = '[class*="reference"], [class*="confirmation"]';
  private readonly ERROR_MESSAGE = '[class*="error"], [class*="alert-error"]';
  private readonly SUCCESS_MESSAGE = '[class*="success"], [class*="confirmation"]';
  private readonly LOADING_SPINNER =
    '[class*="spinner"], [class*="loading"], .MuiCircularProgress-root';
  private readonly PAYMENT_FORM = '[class*="payment-form"], form';
  private readonly SECURITY_BADGE = '[class*="security"], [class*="secure"], text=/secure|seguro/i';

  /**
   * Wait for payment page to load
   */
  async waitForPageLoad() {
    await this.waitForLoadingComplete();
    try {
      await this.waitForVisible(this.CARD_NUMBER_INPUT, 10000);
    } catch {
      // Payment form might have different structure
      await this.waitForVisible(this.PAYMENT_FORM, 10000);
    }
  }

  /**
   * Select payment method
   */
  async selectPaymentMethod(method: string) {
    const normalized = method.toLowerCase();
    if (normalized.includes('paypal')) {
      await this.page.getByRole('tab', { name: /paypal/i }).click();
    } else {
      await this.page
        .getByRole('tab', { name: /card|tarjeta/i })
        .first()
        .click();
    }
  }

  /**
   * Fill card number
   */
  async fillCardNumber(cardNumber: string) {
    const input = this.page.locator(this.CARD_NUMBER_INPUT).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.CARD_NUMBER_INPUT, cardNumber);
    }
  }

  /**
   * Fill cardholder name
   */
  async fillCardholderName(name: string) {
    const input = this.page.locator(this.CARDHOLDER_NAME_INPUT).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.CARDHOLDER_NAME_INPUT, name);
    }
  }

  /**
   * Fill expiry date
   */
  async fillExpiryDate(date: string) {
    // Format: MM/YY
    const input = this.page.locator(this.EXPIRY_DATE_INPUT).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.EXPIRY_DATE_INPUT, date);
    }
  }

  /**
   * Fill CVV
   */
  async fillCVV(cvv: string) {
    const input = this.page.locator(this.CVV_INPUT).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.CVV_INPUT, cvv);
    }
  }

  /**
   * Fill billing address
   */
  async fillBillingAddress(address: string) {
    const input = this.page.locator(this.BILLING_ADDRESS_INPUT).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.BILLING_ADDRESS_INPUT, address);
    }
  }

  /**
   * Fill billing city
   */
  async fillBillingCity(city: string) {
    const input = this.page.locator(this.BILLING_CITY_INPUT).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.BILLING_CITY_INPUT, city);
    }
  }

  /**
   * Fill billing state
   */
  async fillBillingState(state: string) {
    const input = this.page.locator(this.BILLING_STATE_INPUT).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.BILLING_STATE_INPUT, state);
    }
  }

  /**
   * Fill billing ZIP code
   */
  async fillBillingZip(zip: string) {
    const input = this.page.locator(this.BILLING_ZIP_INPUT).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.BILLING_ZIP_INPUT, zip);
    }
  }

  /**
   * Select billing country
   */
  async selectBillingCountry(country: string) {
    const input = this.page.locator(this.BILLING_COUNTRY_INPUT).first();
    if ((await input.count()) > 0) {
      const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await input.selectOption(country);
      } else {
        await this.fillInput(this.BILLING_COUNTRY_INPUT, country);
        await this.page.keyboard.press('ArrowDown');
        await this.page.keyboard.press('Enter');
      }
    }
  }

  /**
   * Check "Same as shipping" checkbox
   */
  async checkSameAsShipping() {
    const checkbox = this.page.locator(this.SAME_AS_SHIPPING_CHECKBOX).first();
    if ((await checkbox.count()) > 0) {
      await checkbox.check();
    }
  }

  /**
   * Fill credit card information
   */
  async fillPaymentInformation(paymentInfo: {
    cardNumber?: string;
    cardholderName?: string;
    expiryDate?: string;
    cvv?: string;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingZip?: string;
    billingCountry?: string;
  }) {
    if (paymentInfo.cardNumber) await this.fillCardNumber(paymentInfo.cardNumber);
    if (paymentInfo.cardholderName) await this.fillCardholderName(paymentInfo.cardholderName);
    if (paymentInfo.expiryDate) await this.fillExpiryDate(paymentInfo.expiryDate);
    if (paymentInfo.cvv) await this.fillCVV(paymentInfo.cvv);
    if (paymentInfo.billingAddress) await this.fillBillingAddress(paymentInfo.billingAddress);
    if (paymentInfo.billingCity) await this.fillBillingCity(paymentInfo.billingCity);
    if (paymentInfo.billingState) await this.fillBillingState(paymentInfo.billingState);
    if (paymentInfo.billingZip) await this.fillBillingZip(paymentInfo.billingZip);
    if (paymentInfo.billingCountry) await this.selectBillingCountry(paymentInfo.billingCountry);
  }

  /**
   * Get payment summary
   */
  async getPaymentSummary() {
    const summary = this.page.locator(this.PAYMENT_SUMMARY).first();
    return {
      totalAmount: await summary.locator(this.TOTAL_AMOUNT).first().textContent(),
      orderId: await summary.locator(this.ORDER_ID).first().textContent(),
      bookingReference: await summary.locator(this.BOOKING_REFERENCE).first().textContent(),
    };
  }

  /**
   * Get total amount
   */
  async getTotalAmount(): Promise<string | null> {
    return await this.getText(this.TOTAL_AMOUNT);
  }

  /**
   * Click pay now button
   */
  async clickPayNow() {
    await this.click(this.PAY_NOW_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Click confirm payment button
   */
  async clickConfirmPayment() {
    await this.click(this.CONFIRM_PAYMENT_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Click back button
   */
  async clickBackButton() {
    await this.click(this.BACK_BUTTON);
    await this.waitForLoadingComplete();
  }

  /**
   * Check if payment has errors
   */
  async hasErrors(): Promise<boolean> {
    return await this.isVisible(this.ERROR_MESSAGE);
  }

  /**
   * Get error messages
   */
  async getErrorMessages(): Promise<string[]> {
    const errors = this.page.locator(this.ERROR_MESSAGE);
    const messages: string[] = [];
    const count = await errors.count();

    for (let i = 0; i < count; i++) {
      const text = await errors.nth(i).textContent();
      if (text) {
        messages.push(text.trim());
      }
    }

    return messages;
  }

  /**
   * Check if payment was successful
   */
  async isPaymentSuccessful(): Promise<boolean> {
    return await this.isVisible(this.SUCCESS_MESSAGE);
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string | null> {
    return await this.getText(this.SUCCESS_MESSAGE);
  }

  /**
   * Get booking reference/order ID
   */
  async getBookingReference(): Promise<string | null> {
    return await this.getText(this.BOOKING_REFERENCE);
  }

  /**
   * Verify payment page elements
   */
  async verifyPageElements(): Promise<boolean> {
    return (
      (await this.isVisible(this.PAYMENT_SUMMARY)) &&
      ((await this.page.locator(this.CARD_NUMBER_INPUT).count()) > 0 ||
        (await this.isVisible(this.PAYMENT_FORM)))
    );
  }

  /**
   * Process full payment - fill info and pay
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async processPayment(paymentInfo: any) {
    await this.fillPaymentInformation(paymentInfo);
    await this.clickPayNow();
    await this.waitForLoadingComplete();
  }

  /**
   * Wait for success page
   */
  async waitForSuccessPage() {
    try {
      await this.waitForVisible(this.SUCCESS_MESSAGE, 10000);
    } catch {
      await this.waitForURL(/confirmation|success|check-in/);
    }
  }

  /**
   * Check if security badge is visible
   */
  async isSecurePayment(): Promise<boolean> {
    return await this.isVisible(this.SECURITY_BADGE);
  }

  /**
   * Scroll to payment form
   */
  async scrollToPaymentForm() {
    await this.page.locator(this.PAYMENT_FORM).first().scrollIntoViewIfNeeded();
  }
}
