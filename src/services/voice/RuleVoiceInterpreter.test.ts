import { describe, expect, it } from 'vitest'
import { FIXED_CATEGORIES } from '@/constants/categories'
import { AccountType, Category, Currency } from '@/types/enums'
import { RuleVoiceInterpreter } from './RuleVoiceInterpreter'
import type { VoiceInterpretContext } from './types'

const interpreter = new RuleVoiceInterpreter()

function ctx(partial: Partial<VoiceInterpretContext> = {}): VoiceInterpretContext {
  return {
    enabledAccounts: [AccountType.WHITE, AccountType.CASH],
    enabledCurrencies: [Currency.USD, Currency.ARS],
    enabledFixedCategories: [...FIXED_CATEGORIES],
    customCategories: [],
    monthOnlyCategories: [],
    activeAccountType: AccountType.WHITE,
    ...partial,
  }
}

describe('RuleVoiceInterpreter', () => {
  it('registra gym en negro con dígitos', () => {
    const result = interpreter.interpret(
      'Agrega gimnasio en negro 50.000 pesos',
      ctx(),
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.category).toBe(Category.GYM)
    expect(result.draft.accountType).toBe(AccountType.CASH)
    expect(result.draft.originalAmount).toBe(50000)
    expect(result.draft.originalCurrency).toBe(Currency.ARS)
    expect(result.draft.description).toBeNull()
  })

  it('registra super en negro en dólares', () => {
    const result = interpreter.interpret(
      'Agrega super en negro por 128,2 dolares',
      ctx(),
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.category).toBe(Category.SUPER)
    expect(result.draft.accountType).toBe(AccountType.CASH)
    expect(result.draft.originalAmount).toBe(128.2)
    expect(result.draft.originalCurrency).toBe(Currency.USD)
  })

  it('crea categoría del mes si no existe', () => {
    const result = interpreter.interpret('Agrega caramelos por 2000 pesos', ctx())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.category).toBe(Category.OTHER)
    expect(result.draft.monthOnlyCategory).toBe(true)
    expect(result.draft.label.toLowerCase()).toBe('caramelos')
    expect(result.draft.originalAmount).toBe(2000)
    expect(result.draft.accountType).toBe(AccountType.WHITE)
  })

  it('usa categoría ya creada este mes', () => {
    const result = interpreter.interpret(
      'Agrega ojotas por 100.000 pesos',
      ctx({ monthOnlyCategories: ['Ojotas'] }),
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.category).toBe(Category.OTHER)
    expect(result.draft.description).toBe('Ojotas')
    expect(result.draft.monthOnlyCategory).toBe(true)
  })

  it('separa categoría y descripción: super dia', () => {
    const result = interpreter.interpret('agrega super dia 50.000 pesos', ctx())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.category).toBe(Category.SUPER)
    expect(result.draft.description?.toLowerCase()).toBe('dia')
    expect(result.draft.originalAmount).toBe(50000)
  })

  it('entiende cincuenta mil en palabras', () => {
    const result = interpreter.interpret(
      'agrega gimnasio en negro cincuenta mil pesos',
      ctx(),
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.originalAmount).toBe(50000)
    expect(result.draft.category).toBe(Category.GYM)
  })

  it('el audio de cuenta tiene prioridad sobre la pestaña', () => {
    const result = interpreter.interpret(
      'agrega gym en negro 10.000 pesos',
      ctx({ activeAccountType: AccountType.WHITE }),
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.accountType).toBe(AccountType.CASH)
  })

  it('default de moneda es pesos', () => {
    const result = interpreter.interpret('agrega gym 2000', ctx())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.originalCurrency).toBe(Currency.ARS)
  })

  it('error si pide dólares y solo hay pesos', () => {
    const result = interpreter.interpret(
      'agrega gym 20 dolares',
      ctx({ enabledCurrencies: [Currency.ARS] }),
    )
    expect(result.status).toBe('error')
    if (result.status !== 'error') return
    expect(result.message).toMatch(/Ajustes/i)
    expect(result.message).toMatch(/dólares|dolares|Dólares/i)
  })

  it('error si el default pesos no está habilitado', () => {
    const result = interpreter.interpret(
      'agrega gym 20',
      ctx({ enabledCurrencies: [Currency.USD] }),
    )
    expect(result.status).toBe('error')
    if (result.status !== 'error') return
    expect(result.message).toMatch(/Ajustes/i)
  })

  it('une 80 000 con espacio y reconoce agrégame + auto/nafta', () => {
    const result = interpreter.interpret(
      'Agrégame 80 000 pesos en auto nafta',
      ctx(),
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.category).toBe(Category.AUTO)
    expect(result.draft.description?.toLowerCase()).toBe('nafta')
    expect(result.draft.originalAmount).toBe(80000)
    expect(result.draft.originalCurrency).toBe(Currency.ARS)
    expect(result.draft.monthOnlyCategory).toBe(false)
  })

  it('reconoce dólares y pesos después del número', () => {
    const usd = interpreter.interpret('agrega auto nafta 80 000 dolares', ctx())
    expect(usd.status).toBe('ok')
    if (usd.status === 'ok') {
      expect(usd.draft.originalCurrency).toBe(Currency.USD)
      expect(usd.draft.originalAmount).toBe(80000)
      expect(usd.draft.category).toBe(Category.AUTO)
    }

    const ars = interpreter.interpret('agrega gym 50 000 pesos', ctx())
    expect(ars.status).toBe('ok')
    if (ars.status === 'ok') {
      expect(ars.draft.originalCurrency).toBe(Currency.ARS)
      expect(ars.draft.originalAmount).toBe(50000)
    }

    const glued = interpreter.interpret('agrega gym 20000dolares', ctx())
    expect(glued.status).toBe('ok')
    if (glued.status === 'ok') {
      expect(glued.draft.originalCurrency).toBe(Currency.USD)
      expect(glued.draft.originalAmount).toBe(20000)
    }
  })

  it('parsea dólares con acento o dollar', () => {
    for (const phrase of [
      'agrega gym 20 dólares',
      'agrega gym 20 dolares.',
      'agrega gym 20 dollars',
    ]) {
      const result = interpreter.interpret(phrase, ctx())
      expect(result.status, phrase).toBe('ok')
      if (result.status !== 'ok') return
      expect(result.draft.originalCurrency, phrase).toBe(Currency.USD)
    }
  })

  it('no toma $ como dólares (en es-AR es pesos)', () => {
    const result = interpreter.interpret('agrega gym 80 000 $', ctx())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.draft.originalCurrency).toBe(Currency.ARS)
  })

  it('pide aclarar cuenta si estás en Totales', () => {
    const result = interpreter.interpret(
      'agrega gym 20 pesos',
      ctx({ activeAccountType: null }),
    )
    expect(result.status).toBe('error')
    if (result.status !== 'error') return
    expect(result.message).toMatch(/blanco o en negro/i)
  })
})
