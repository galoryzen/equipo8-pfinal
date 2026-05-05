import { BasePage } from './BasePage';
import { AdditionalGuest, CreditCardInfo, OwnerInfo } from './types';

/**
 * Page Object for Booking/Fill Data page
 * Handles filling out guest information and booking details
 */
export class BookingPage extends BasePage {
  // Locators
  private readonly OWNER_FIRST_NAME =
    '[data-testid="traveler-payment-first-name"]';
  private readonly OWNER_LAST_NAME =
    '[data-testid="traveler-payment-last-name"]';
  private readonly OWNER_EMAIL = '[data-testid="traveler-payment-email"]';
  private readonly OWNER_PHONE =
    '[data-testid="traveler-payment-phone"]';

  private readonly ADDITIONAL_GUEST_FIRST_NAME = (idx: number) =>
    `[data-testid="traveler-payment-additional-first-name-${idx}"]`;
  private readonly ADDITIONAL_GUEST_LAST_NAME =
    (idx: number) => `[data-testid="traveler-payment-additional-last-name-${idx}"]`;

  private readonly BOOKING_NOTES =
    'textarea[placeholder*="Notas"], textarea[placeholder*="Notes"], textarea[placeholder*="Comentarios"]';
  private readonly SPECIAL_REQUESTS =
    'textarea[placeholder*="Solicitudes"], textarea[placeholder*="Requests"]';
  private readonly BOOKING_SUMMARY = '[data-testid="traveler-payment-summary-card"]';
  private readonly DATES_DISPLAY = '[data-testid="traveler-payment-summary-dates"]';
  private readonly ROOM_NAME_DISPLAY = '[data-testid="traveler-payment-summary-room-name"]';
  private readonly TOTAL_PRICE_DISPLAY = '[class*="total"], [class*="price"]';
  private readonly GUESTS_NIGHTS_DISPLAY = '[data-testid="traveler-payment-summary-guests-nights"]';
  private readonly CONTINUE_PAYMENT_BUTTON = '[data-testid="traveler-payment-submit"]';
  private readonly BACK_BUTTON = 'button:has-text("Atrás"), button:has-text("Back")';
  private readonly ERROR_MESSAGE = '[class*="error"], [class*="alert-error"]';
  private readonly LOADING_SPINNER =
    '[class*="spinner"], [class*="loading"], .MuiCircularProgress-root';
  private readonly FORM_SECTION = '[class*="form"], [class*="section"]';
  private readonly AGREE_TERMS_CHECKBOX = 'input[type="checkbox"]';
  private readonly AGREE_TERMS_LABEL = 'text=/Acepto|Agree|Términos/i';

  // Credit card information
  private readonly CREDIT_CARD_NUMBER = '[data-testid="traveler-payment-card-number"]';
  private readonly CREDIT_CARD_EXPIRY = '[data-testid="traveler-payment-card-expiry"]';
  private readonly CREDIT_CARD_CVV = '[data-testid="traveler-payment-card-cvv"]';
  private readonly CREDIT_CARD_NAME = '[data-testid="traveler-payment-card-name"]';

  /**
   * Fill guest first name
   */
  async fillFirstName(firstName: string) {
    const input = this.page.locator(this.OWNER_FIRST_NAME).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.OWNER_FIRST_NAME, firstName);
    }
  }

  /**
   * Fill guest last name
   */
  async fillLastName(lastName: string) {
    const input = this.page.locator(this.OWNER_LAST_NAME).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.OWNER_LAST_NAME, lastName);
    }
  }

  /**
   * Fill additional guest first name by index
   */
  async fillAdditionalGuestFirstName(firstName: string, idx: number) {
    await this.fillInput(this.ADDITIONAL_GUEST_FIRST_NAME(idx), firstName);
  }

  /**
   * Fill additional guest last name by index
   */
  async fillAdditionalGuestLastName(lastName: string, idx: number) {
    await this.fillInput(this.ADDITIONAL_GUEST_LAST_NAME(idx), lastName);
  }

  /**
   * Fill guest email
   */
  async fillEmail(email: string) {
    const input = this.page.locator(this.OWNER_EMAIL).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.OWNER_EMAIL, email);
    }
  }

  /**
   * Fill guest phone
   */
  async fillPhone(phone: string) {
    const input = this.page.locator(this.OWNER_PHONE).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.OWNER_PHONE, phone);
    }
  }


  /**
   * Fill booking notes
   */
  async fillNotes(notes: string) {
    const textarea = this.page.locator(this.BOOKING_NOTES).first();
    if ((await textarea.count()) > 0) {
      await this.fillInput(this.BOOKING_NOTES, notes);
    }
  }

  /**
   * Fill special requests
   */
  async fillSpecialRequests(requests: string) {
    const textarea = this.page.locator(this.SPECIAL_REQUESTS).first();
    if ((await textarea.count()) > 0) {
      await this.fillInput(this.SPECIAL_REQUESTS, requests);
    }
  }

  /**
   * Fill all guest information
   */
  async fillOwnerInformation(ownerInfo: OwnerInfo) {
    if (ownerInfo.firstName) await this.fillFirstName(ownerInfo.firstName);
    if (ownerInfo.lastName) await this.fillLastName(ownerInfo.lastName);
    if (ownerInfo.email) await this.fillEmail(ownerInfo.email);
    if (ownerInfo.phone) await this.fillPhone(ownerInfo.phone);
    if (ownerInfo.notes) await this.fillNotes(ownerInfo.notes);
  }

  /**
   * Fill additional guests information
   */
  async fillAdditionalGuestsInformation(additionalGuests: AdditionalGuest[]) {
    for (let i = 0; i < additionalGuests.length; i++) {
      await this.fillAdditionalGuestFirstName(additionalGuests[i].firstName, i);
      await this.fillAdditionalGuestLastName(additionalGuests[i].lastName, i);
    }
  }

  /**
   * Get booking summary information
   */
  async getBookingSummary() {
    const summary = this.page.locator(this.BOOKING_SUMMARY);

    return {
      room: await summary.locator(this.ROOM_NAME_DISPLAY).textContent(),
      dates: await summary.locator(this.DATES_DISPLAY).textContent(),
      guests_nights: await summary.locator(this.GUESTS_NIGHTS_DISPLAY).textContent(),
    };
  }

  /**
   * Fill credit card information
   */
  async fillCreditCardInformation(creditCardInfo: CreditCardInfo) {
    if (creditCardInfo.number) await this.fillInput(this.CREDIT_CARD_NUMBER, creditCardInfo.number);
    if (creditCardInfo.expiry) await this.fillInput(this.CREDIT_CARD_EXPIRY, creditCardInfo.expiry);
    if (creditCardInfo.cvv) await this.fillInput(this.CREDIT_CARD_CVV, creditCardInfo.cvv);
    if (creditCardInfo.name) await this.fillInput(this.CREDIT_CARD_NAME, creditCardInfo.name);
  }

  /**
   * Check if form has errors
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
   * Click continue to payment button
   */
  async clickContinueToPayment() {
    await this.click(this.CONTINUE_PAYMENT_BUTTON);
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
   * Verify booking page elements
   */
  async verifyPageElements(): Promise<boolean> {
    return (
      (await this.isVisible(this.BOOKING_SUMMARY)) &&
      ((await this.page.locator(this.OWNER_EMAIL).count()) > 0 ||
        (await this.page.locator(this.OWNER_FIRST_NAME).count()) > 0)
    );
  }

  /**
   * Proceed with booking - fill info and continue
   */
   
  async proceedWithBooking(ownerInfo: OwnerInfo, additionalGuests: AdditionalGuest[], creditCardInfo: CreditCardInfo) {
    await this.fillOwnerInformation(ownerInfo);
    await this.fillAdditionalGuestsInformation(additionalGuests);
    await this.fillCreditCardInformation(creditCardInfo);
    await this.clickContinueToPayment();
    await this.waitForLoadingComplete();
  }

  /**
   * Get total price
   */
  async getTotalPrice(): Promise<string | null> {
    return await this.getText(this.TOTAL_PRICE_DISPLAY);
  }

  /**
   * Scroll to form
   */
  async scrollToForm() {
    await this.page.locator(this.FORM_SECTION).first().scrollIntoViewIfNeeded();
  }

  /**
   * Wait for redirect to payment
   */
  async waitForPaymentRedirect() {
    await this.waitForURL(/payment/);
  }

  /**
   * Verify guest information fields are pre-filled
   */
  async verifyPrefilledInformation(email: string): Promise<boolean> {
    const emailValue = await this.page.locator(this.OWNER_EMAIL).first().inputValue();
    return emailValue.includes(email);
  }
}
