import { AccountType, Category, Currency } from '@/types/enums'
import { matchExpenseCategory } from './matchCategory'
import {
  parseMercadoPagoNotification,
  type MercadoPagoNoticeKind,
} from './parseNotification'

export interface MercadoPagoReview {
  noticeId: string
  externalId: string
  kind: MercadoPagoNoticeKind
  amount: number
  currency: Currency
  detail: string
  accountType: AccountType
  category: Category | null
  customName: string | null
  postedAt: string
}

export interface MercadoPagoAutoExpense {
  noticeId: string
  externalId: string
  amount: number
  currency: Currency
  detail: string
  accountType: AccountType
  category: Category
  customName: string | null
  postedAt: string
}

export type MercadoPagoPlan =
  | { type: 'ignore'; noticeId: string; externalId: string }
  | { type: 'auto'; expense: MercadoPagoAutoExpense }
  | { type: 'review'; review: MercadoPagoReview }

export function accountForMercadoPagoExpense(
  enabledAccounts: AccountType[],
): AccountType {
  if (enabledAccounts.includes(AccountType.WHITE)) return AccountType.WHITE
  if (enabledAccounts.includes(AccountType.CASH)) return AccountType.CASH
  return AccountType.WHITE
}

export function planMercadoPagoNotice(input: {
  noticeId: string
  externalId: string
  title: string
  body: string
  postedAt: string
  enabledAccounts: AccountType[]
  enabledFixed: Category[]
  customCategories: string[]
}): MercadoPagoPlan {
  const parsed = parseMercadoPagoNotification(input.title, input.body)
  if (!parsed) {
    return {
      type: 'ignore',
      noticeId: input.noticeId,
      externalId: input.externalId,
    }
  }

  const accountType = accountForMercadoPagoExpense(input.enabledAccounts)
  const match = matchExpenseCategory(
    parsed.merchant,
    input.enabledFixed,
    input.customCategories,
  )
  const detail = parsed.merchant

  if (parsed.kind === 'payment' && match && match.customName == null) {
    return {
      type: 'auto',
      expense: {
        noticeId: input.noticeId,
        externalId: input.externalId,
        amount: parsed.amount,
        currency: Currency.ARS,
        detail,
        accountType,
        category: match.category,
        customName: null,
        postedAt: input.postedAt,
      },
    }
  }

  return {
    type: 'review',
    review: {
      noticeId: input.noticeId,
      externalId: input.externalId,
      kind: parsed.kind,
      amount: parsed.amount,
      currency: Currency.ARS,
      detail,
      accountType,
      category: match?.category ?? null,
      customName: match?.customName ?? null,
      postedAt: input.postedAt,
    },
  }
}
