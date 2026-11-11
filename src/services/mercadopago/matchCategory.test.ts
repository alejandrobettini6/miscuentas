import { describe, expect, it } from 'vitest'
import { Category } from '@/types/enums'
import { FIXED_CATEGORIES } from '@/constants/categories'
import { matchExpenseCategory } from './matchCategory'

describe('matchExpenseCategory', () => {
  it('asigna Farmacity a Salud', () => {
    expect(matchExpenseCategory('Farmacity', FIXED_CATEGORIES, [])).toEqual({
      category: Category.SALUD,
      customName: null,
    })
  })

  it('no adivina un comercio desconocido', () => {
    expect(matchExpenseCategory('Kiosco Don Pedro', FIXED_CATEGORIES, [])).toBeNull()
  })

  it('respeta una categoría personalizada', () => {
    expect(matchExpenseCategory('Verduleria Lopez', FIXED_CATEGORIES, ['Verduleria'])).toEqual({
      category: Category.OTHER,
      customName: 'Verduleria',
    })
  })

  it('no elige si hay más de una coincidencia', () => {
    expect(
      matchExpenseCategory('Farmacia del super', FIXED_CATEGORIES, []),
    ).toBeNull()
  })
})
