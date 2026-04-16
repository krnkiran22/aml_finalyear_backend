export const RISK_THRESHOLDS = {
  SAFE_MAX: 299,
  LOW_RISK_MAX: 499,
  FLAGGED_MAX: 749,
  HIGH_RISK_MAX: 1000,
} as const;

export const SCORE_WEIGHTS = {
  COUNTRY_RISK: 1,
  TRANSACTION_RISK: 1,
  BEHAVIOURAL_RISK: 1,
} as const;

export const MONTHLY_THRESHOLD_MULTIPLIER = 1.5;

export const INDIAN_DOCUMENT_TYPES = ['AADHAAR', 'PAN', 'PASSPORT'] as const;
export const INTERNATIONAL_DOCUMENT_TYPES = ['PASSPORT', 'DRIVING_LICENSE'] as const;

export const INDIAN_COUNTRY_CODE = 'IN';

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const JWT_SIGN_MESSAGE_PREFIX = 'Sign in to ChainGuard AML: ';

export const BEHAVIOURAL_SCORE_REFRESH_HOURS = 24;
export const BEHAVIOURAL_HISTORY_DAYS = 90;

export const RISK_COLORS = {
  SAFE: '#30d158',
  LOW_RISK: '#ffd60a',
  FLAGGED: '#ff9f0a',
  HIGH_RISK: '#ff453a',
} as const;

export const SUPPORTED_CURRENCIES: Record<string, string> = {
  USD: 'US Dollar',
  INR: 'Indian Rupee',
  EUR: 'Euro',
  GBP: 'British Pound',
  AED: 'UAE Dirham',
  SGD: 'Singapore Dollar',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  KRW: 'South Korean Won',
  BRL: 'Brazilian Real',
  MXN: 'Mexican Peso',
  ZAR: 'South African Rand',
  NGN: 'Nigerian Naira',
  PKR: 'Pakistani Rupee',
  BDT: 'Bangladeshi Taka',
};

export const STATIC_EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  INR: 0.012,
  EUR: 1.08,
  GBP: 1.27,
  AED: 0.272,
  SGD: 0.74,
  CAD: 0.73,
  AUD: 0.65,
  JPY: 0.0067,
  CHF: 1.13,
  CNY: 0.138,
  KRW: 0.00074,
  BRL: 0.2,
  MXN: 0.058,
  ZAR: 0.054,
  NGN: 0.00065,
  PKR: 0.0036,
  BDT: 0.0091,
};
