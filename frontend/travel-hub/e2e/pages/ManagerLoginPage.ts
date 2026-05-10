import { BasePage } from './BasePage';

export class ManagerLoginPage extends BasePage {
  private readonly EMAIL_INPUT = '#email';
  private readonly PASSWORD_INPUT = '#password';
  private readonly SUBMIT_BUTTON = 'button[type="submit"]';

  async goToLoginPage() {
    await this.goto('/login/manager');
    await this.waitForLoadingComplete();
  }

  async login(email: string, password: string) {
    await this.fillInput(this.EMAIL_INPUT, email);
    await this.fillInput(this.PASSWORD_INPUT, password);
    await this.click(this.SUBMIT_BUTTON);

    try {
      await this.waitForAPIResponse(/auth|login/, 10000);
      await this.waitForLoadingComplete();
    } catch {
      // API response might not occur if there's a validation error
    }
  }

  async waitForRedirect(timeout = 15000) {
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout });
    await this.waitForLoadingComplete();
  }

  async waitForPageLoad() {
    await this.waitForVisible(this.EMAIL_INPUT, 10000);
  }

  async hasErrorMessage(): Promise<boolean> {
    return this.isVisible('[class*="error"], [class*="MuiAlert"]');
  }
}
