import { BasePage } from './BasePage';

/**
 * Page Object for Booking/Fill Data page
 * Handles filling out guest information and booking details
 */
export class BookingPage extends BasePage {
  // Locators
  private readonly GUEST_FIRST_NAME =
    'input[placeholder*="Nombre"], input[placeholder*="First name"]';
  private readonly GUEST_LAST_NAME =
    'input[placeholder*="Apellido"], input[placeholder*="Last name"]';
  private readonly GUEST_EMAIL = 'input[type="email"]';
  private readonly GUEST_PHONE =
    'input[type="tel"], input[placeholder*="Teléfono"], input[placeholder*="Phone"]';
  private readonly GUEST_COUNTRY =
    'input[placeholder*="País"], input[placeholder*="Country"], select';
  private readonly BOOKING_NOTES =
    'textarea[placeholder*="Notas"], textarea[placeholder*="Notes"], textarea[placeholder*="Comentarios"]';
  private readonly SPECIAL_REQUESTS =
    'textarea[placeholder*="Solicitudes"], textarea[placeholder*="Requests"]';
  private readonly BOOKING_SUMMARY = '[class*="summary"], [class*="order-summary"]';
  private readonly CHECK_IN_DATE_DISPLAY = '[class*="check-in"], text=/Check-in|Entrada/i';
  private readonly CHECK_OUT_DATE_DISPLAY = '[class*="check-out"], text=/Check-out|Salida/i';
  private readonly ROOM_SELECTION_DISPLAY = '[class*="room"], [class*="selected-room"]';
  private readonly TOTAL_PRICE_DISPLAY = '[class*="total"], [class*="price"]';
  private readonly GUESTS_COUNT_DISPLAY = '[class*="guests"], [class*="number-guests"]';
  private readonly NIGHTS_DISPLAY = '[class*="nights"], [class*="duration"]';
  private readonly CONTINUE_PAYMENT_BUTTON =
    'button:has-text("Continuar"), button:has-text("Siguiente"), button:has-text("Pagar"), button:has-text("Continue")';
  private readonly BACK_BUTTON = 'button:has-text("Atrás"), button:has-text("Back")';
  private readonly ERROR_MESSAGE = '[class*="error"], [class*="alert-error"]';
  private readonly LOADING_SPINNER =
    '[class*="spinner"], [class*="loading"], .MuiCircularProgress-root';
  private readonly FORM_SECTION = '[class*="form"], [class*="section"]';
  private readonly AGREE_TERMS_CHECKBOX = 'input[type="checkbox"]';
  private readonly AGREE_TERMS_LABEL = 'text=/Acepto|Agree|Términos/i';

  /**
   * Wait for booking page to load
   */
  async waitForPageLoad() {
    await this.waitForLoadingComplete();
    // At least one input field should be visible
    try {
      await this.waitForVisible(this.GUEST_FIRST_NAME, 10000);
    } catch {
      await this.waitForVisible(this.GUEST_EMAIL, 10000);
    }
  }

  /**
   * Fill guest first name
   */
  async fillFirstName(firstName: string) {
    const input = this.page.locator(this.GUEST_FIRST_NAME).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.GUEST_FIRST_NAME, firstName);
    }
  }

  /**
   * Fill guest last name
   */
  async fillLastName(lastName: string) {
    const input = this.page.locator(this.GUEST_LAST_NAME).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.GUEST_LAST_NAME, lastName);
    }
  }

  /**
   * Fill guest email
   */
  async fillEmail(email: string) {
    const input = this.page.locator(this.GUEST_EMAIL).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.GUEST_EMAIL, email);
    }
  }

  /**
   * Fill guest phone
   */
  async fillPhone(phone: string) {
    const input = this.page.locator(this.GUEST_PHONE).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.GUEST_PHONE, phone);
    }
  }

  /**
   * Select guest country
   */
  async selectCountry(country: string) {
    const input = this.page.locator(this.GUEST_COUNTRY).first();
    if ((await input.count()) > 0) {
      await this.fillInput(this.GUEST_COUNTRY, country);
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
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
  async fillGuestInformation(guestInfo: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    country?: string;
    notes?: string;
    specialRequests?: string;
  }) {
    if (guestInfo.firstName) await this.fillFirstName(guestInfo.firstName);
    if (guestInfo.lastName) await this.fillLastName(guestInfo.lastName);
    if (guestInfo.email) await this.fillEmail(guestInfo.email);
    if (guestInfo.phone) await this.fillPhone(guestInfo.phone);
    if (guestInfo.country) await this.selectCountry(guestInfo.country);
    if (guestInfo.notes) await this.fillNotes(guestInfo.notes);
    if (guestInfo.specialRequests) await this.fillSpecialRequests(guestInfo.specialRequests);
  }

  /**
   * Get booking summary information
   */
  async getBookingSummary() {
    const summary = this.page.locator(this.BOOKING_SUMMARY).first();
    return {
      checkIn: await summary.locator(this.CHECK_IN_DATE_DISPLAY).first().textContent(),
      checkOut: await summary.locator(this.CHECK_OUT_DATE_DISPLAY).first().textContent(),
      room: await summary.locator(this.ROOM_SELECTION_DISPLAY).first().textContent(),
      totalPrice: await summary.locator(this.TOTAL_PRICE_DISPLAY).first().textContent(),
      guests: await summary.locator(this.GUESTS_COUNT_DISPLAY).first().textContent(),
      nights: await summary.locator(this.NIGHTS_DISPLAY).first().textContent(),
    };
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
   * Agree to terms and conditions
   */
  async agreeToTerms() {
    const checkbox = this.page.locator(this.AGREE_TERMS_CHECKBOX).first();
    if ((await checkbox.count()) > 0) {
      await checkbox.check();
    }
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
      ((await this.page.locator(this.GUEST_EMAIL).count()) > 0 ||
        (await this.page.locator(this.GUEST_FIRST_NAME).count()) > 0)
    );
  }

  /**
   * Proceed with booking - fill info and continue
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async proceedWithBooking(guestInfo: any) {
    await this.fillGuestInformation(guestInfo);
    await this.agreeToTerms();
    await this.clickContinueToPayment();
    await this.waitForURL(/payment/);
  }

  /**
   * Get total nights
   */
  async getTotalNights(): Promise<string | null> {
    return await this.getText(this.NIGHTS_DISPLAY);
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
    const emailValue = await this.page.locator(this.GUEST_EMAIL).first().inputValue();
    return emailValue.includes(email);
  }
}
