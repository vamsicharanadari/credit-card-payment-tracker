export type AccountType = 
  | 'credit_card' 
  | 'checking' 
  | 'savings' 
  | 'investment' 
  | 'retirement' 
  | 'other'
  | 'CASH'
  | 'CREDIT_CARD'
  | 'SECURITIES'
  | 'CRYPTOCURRENCY'
  | string;

export interface WealthfolioAccount {
  id: string;
  name: string;
  accountType?: string;
  type?: AccountType;
  group?: string;
  currency: string;
  balance: number;
  isDefault?: boolean;
  isActive?: boolean;
  isArchived?: boolean;
  accountNumber?: string;
  institution?: string;
  mask?: string;
}

export interface CardMetadata {
  accountId: string;
  dueDate: string; // ISO date string: YYYY-MM-DD
  paymentDue: number;
  creditLimit: number;
  payableAccountId?: string;
  imageUrl?: string; // Optional custom card artwork / image URL
  interestRate?: number; // Optional APR %
  promoExpirationDate?: string; // Optional ISO date string: YYYY-MM-DD
  isExcludedFromGlance?: boolean;
  isConfigured?: boolean;
}

export interface CashAccountMetadata {
  accountId: string;
  isExcludedFromGlance?: boolean;
}

export type BillUrgency = 'critical' | 'upcoming' | 'later' | 'paid';

export interface EnrichedCreditCard {
  account: WealthfolioAccount;
  meta: CardMetadata;
  daysRemaining: number;
  urgency: BillUrgency;
  utilization: number; // percentage (0 - 100+)
  isInsufficientFunds: boolean;
  shortfallAmount?: number; // Exact amount short (e.g. 55.00)
  projectedPayableBalance?: number; // Balance before this payment in the queue
  remainingPayableBalance?: number; // Balance after this payment
  payableAccount?: WealthfolioAccount;
}

export interface EnrichedCashAccount {
  account: WealthfolioAccount;
  isExcluded: boolean;
}

export interface AddonStorageAPI {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove?: (key: string) => Promise<void>;
}

export interface AccountValuation {
  id: string;
  accountId: string;
  valuationDate: string;
  accountCurrency: string;
  baseCurrency: string;
  fxRateToBase: number;
  cashBalance: number;
  investmentMarketValue: number;
  totalValue: number;
  costBasis: number;
}

export interface AddonContext {
  api: {
    accounts: {
      getAll: () => Promise<any[]>;
    };
    portfolio?: {
      getLatestValuations: (accountIds: string[]) => Promise<AccountValuation[]>;
    };
    activities: {
      create: (activity: any) => Promise<any>;
    };
    storage: AddonStorageAPI;
    toast?: {
      success: (msg: string) => void;
      error: (msg: string) => void;
      info: (msg: string) => void;
    };
  };
}
