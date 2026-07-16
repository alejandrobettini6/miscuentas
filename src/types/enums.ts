/** Contabilidades internas. UI: Blanco / Negro */
export enum AccountType {
  WHITE = 'WHITE',
  CASH = 'CASH',
}

/**
 * Monedas soportadas.
 * Para agregar EUR/GBP: extender este enum, CurrencyConverter y el toggle de moneda en AmountInput.
 */
export enum Currency {
  USD = 'USD',
  ARS = 'ARS',
  // EUR = 'EUR',
  // GBP = 'GBP',
}

export enum Category {
  SUPER = 'SUPER',
  DELIVERY = 'DELIVERY',
  AUTO = 'AUTO',
  SALUD = 'SALUD',
  SERVICIOS = 'SERVICIOS',
  NINA = 'NINA',
  SALIDAS = 'SALIDAS',
  PELO = 'PELO',
  GYM = 'GYM',
  LIMPIEZA = 'LIMPIEZA',
  TAXES = 'TAXES',
  REFUNDS = 'REFUNDS',
  OTHER = 'OTHER',
}

export enum BudgetColor {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  ORANGE = 'ORANGE',
  RED = 'RED',
}

export enum PeriodStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

/** Cómo avanza el mes: calendario automático o cierre manual. */
export enum MonthMode {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
}

export enum OfflineOperationType {
  CREATE_EXPENSE = 'CREATE_EXPENSE',
  UPDATE_EXPENSE = 'UPDATE_EXPENSE',
  DELETE_EXPENSE = 'DELETE_EXPENSE',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  RESET_MONTH = 'RESET_MONTH',
  CLOSE_PERIOD = 'CLOSE_PERIOD',
}

export enum OfflineOperationStatus {
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}
