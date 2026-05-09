export interface PaymentIntentResult {
  payment_intent_id: string;
  mock_payment_token: string;
  amount: string;
  currency_code: string;
  webhook_signing_secret: string;
}
