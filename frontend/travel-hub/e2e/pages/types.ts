export interface AdditionalGuest {
  id: string;
  firstName: string;
  lastName: string;
}

export interface OwnerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface CreditCardInfo {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}
