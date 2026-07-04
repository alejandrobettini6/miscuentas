/** Contabilidades internas. UI: Blanco / Barrani */
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
  OTHER = 'OTHER',
}

export enum BudgetColor {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  ORANGE = 'ORANGE',
  RED = 'RED',
}

export enum OfflineOperationType {
  CREATE_EXPENSE = 'CREATE_EXPENSE',
  UPDATE_EXPENSE = 'UPDATE_EXPENSE',
  DELETE_EXPENSE = 'DELETE_EXPENSE',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  RESET_MONTH = 'RESET_MONTH',
}

export enum OfflineOperationStatus {
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}
