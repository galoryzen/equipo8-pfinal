import { BasePage } from './BasePage';

/**
 * Page Object for the Login page
 * Handles all login interactions including email/password entry and submission
 */
export class LoginPage extends BasePage {
  // Locators
  private readonly EMAIL_INPUT = '[data-testid="traveler-login-email"]';
  private readonly PASSWORD_INPUT = '[data-testid="traveler-login-password"]';
  private readonly LOGIN_BUTTON = '[data-testid="traveler-login-submit"]';
  private readonly REMEMBER_ME_CHECKBOX = 'input[type="checkbox"]';
  private readonly FORGOT_PASSWORD_LINK = 'a:has-text("Olvidé mi contraseña")';
  private readonly REGISTER_LINK = 'a:has-text("Registrarse")';
  private readonly ERROR_MESSAGE = '[class*="error"], [class*="alert-error"]';
  private readonly SUCCESS_MESSAGE = '[class*="success"]';

  /**
   * Navigate to login page
   */
  async goToLoginPage() {
    await this.goto('/login/traveler');
    await this.waitForLoadingComplete();
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    await this.fillInput(this.EMAIL_INPUT, email);
    await this.fillInput(this.PASSWORD_INPUT, password);
    await this.click(this.LOGIN_BUTTON);

    // Wait for either success or error
    try {
      await this.waitForAPIResponse(/auth|login/, 10000);
      await this.waitForLoadingComplete();
    } catch {
      // API response might not occur if there's a validation error
    }
  }

  /**
   * Wait for redirect away from login page after successful login
   */
  async waitForRedirect(timeout = 15000) {
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout });
    await this.waitForLoadingComplete();
  }

  /**
   * Login and wait for redirect to traveler dashboard
   */
  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password);
    await this.waitForURL(/traveler|payment/);
    await this.waitForLoadingComplete();
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.isVisible(this.ERROR_MESSAGE);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    return await this.getText(this.ERROR_MESSAGE);
  }

  /**
   * Check if login form is visible
   */
  async isLoginFormVisible(): Promise<boolean> {
    return (await this.isVisible(this.EMAIL_INPUT)) && (await this.isVisible(this.PASSWORD_INPUT));
  }

  /**
   * Fill email only
   */
  async fillEmail(email: string) {
    await this.fillInput(this.EMAIL_INPUT, email);
  }

  /**
   * Fill password only
   */
  async fillPassword(password: string) {
    await this.fillInput(this.PASSWORD_INPUT, password);
  }

  /**
   * Click login button
   */
  async clickLoginButton() {
    await this.click(this.LOGIN_BUTTON);
  }

  /**
   * Toggle remember me checkbox
   */
  async toggleRememberMe() {
    await this.click(this.REMEMBER_ME_CHECKBOX);
  }

  /**
   * Click forgot password link
   */
  async clickForgotPasswordLink() {
    await this.click(this.FORGOT_PASSWORD_LINK);
  }

  /**
   * Click register link
   */
  async clickRegisterLink() {
    await this.click(this.REGISTER_LINK);
  }

  /**
   * Verify login page elements are present
   */
  async verifyPageElements() {
    return (
      (await this.isVisible(this.EMAIL_INPUT)) &&
      (await this.isVisible(this.PASSWORD_INPUT)) &&
      (await this.isVisible(this.LOGIN_BUTTON))
    );
  }

  /**
   * Wait for login page to load
   */
  async waitForPageLoad() {
    await this.waitForVisible(this.EMAIL_INPUT, 10000);
  }
}
