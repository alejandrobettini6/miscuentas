import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import type { CreateExpenseInput, Period, Settings } from '@/types/models'
import {
  ackMercadoPagoNotice,
  dismissMercadoPagoNotice,
  forgetMercadoPagoApplied,
  listMercadoPagoNotices,
  pullMercadoPagoTestNotices,
  rememberMercadoPagoApplied,
  wasMercadoPagoApplied,
  type MpNotice,
} from '@/services/mercadopago/inbox'
import { periodForMercadoPagoNotice } from '@/services/mercadopago/periodForNotice'
import {
  planMercadoPagoNotice,
  type MercadoPagoAutoExpense,
  type MercadoPagoReview,
} from '@/services/mercadopago/planNotice'
import { normalizeCustomCategoryName } from '@/validators/amount'
import { getErrorMessage } from '@/utils/errors'
import {
  MercadoPagoExpensePrompt,
  type MercadoPagoPromptResult,
} from './MercadoPagoExpensePrompt'

interface MercadoPagoInboxHostProps {
  userId: string
  settings: Settings
  periods: Period[]
  selectedPeriod: Period | null
  createExpense: (input: CreateExpenseInput) => Promise<unknown>
}

type ReviewItem = MercadoPagoReview & { origin: MpNotice['origin'] }

const POLL_MS = 5000

export function MercadoPagoInboxHost({
  userId,
  settings,
  periods,
  selectedPeriod,
  createExpense,
}: MercadoPagoInboxHostProps) {
  const [modal, setModal] = useState<ReviewItem | null>(null)
  const [waiting, setWaiting] = useState<ReviewItem[]>([])
  const [busy, setBusy] = useState(false)
  const seen = useRef(new Set<string>())
  const running = useRef(false)
  const modalRef = useRef<ReviewItem | null>(null)
  const waitingRef = useRef<ReviewItem[]>([])
  const createRef = useRef(createExpense)
  const settingsRef = useRef(settings)
  const periodsRef = useRef(periods)
  const selectedPeriodRef = useRef(selectedPeriod)
  createRef.current = createExpense
  settingsRef.current = settings
  periodsRef.current = periods
  selectedPeriodRef.current = selectedPeriod
  modalRef.current = modal
  waitingRef.current = waiting

  useEffect(() => {
    let alive = true

    const showReviews = (fresh: ReviewItem[]) => {
      const unseen = fresh.filter((review) => !seen.current.has(review.noticeId))
      if (unseen.length === 0) return
      for (const review of unseen) seen.current.add(review.noticeId)

      let nextModal = modalRef.current
      const nextWaiting = [...waitingRef.current]
      for (const review of unseen) {
        if (!nextModal) nextModal = review
        else nextWaiting.push(review)
      }
      waitingRef.current = nextWaiting
      modalRef.current = nextModal
      setWaiting(nextWaiting)
      setModal(nextModal)
    }

    const tick = async () => {
      if (running.current || !alive) return
      running.current = true
      let autoCount = 0
      const reviews: ReviewItem[] = []
      try {
        await pullMercadoPagoTestNotices(userId)
        if (!alive) return
        const notices = await listMercadoPagoNotices(userId)
        const currentSettings = settingsRef.current
        for (const notice of notices) {
          if (!alive || seen.current.has(notice.id)) continue
          const plan = planMercadoPagoNotice({
            noticeId: notice.id,
            externalId: notice.externalId,
            title: notice.title,
            body: notice.body,
            postedAt: notice.postedAt,
            enabledAccounts: currentSettings.enabledAccounts,
            enabledFixed: currentSettings.enabledFixedCategories,
            customCategories: currentSettings.customCategories,
          })

          if (plan.type === 'ignore' || wasMercadoPagoApplied(userId, notice.externalId)) {
            seen.current.add(notice.id)
            await ackMercadoPagoNotice(userId, notice)
            continue
          }

          if (plan.type === 'review') {
            reviews.push({ ...plan.review, origin: notice.origin })
            continue
          }

          const saved = await saveAuto(
            userId,
            plan.expense,
            periodsRef.current,
            selectedPeriodRef.current,
            createRef.current,
          )
          if (saved === 'saved') {
            seen.current.add(notice.id)
            await ackMercadoPagoNotice(userId, notice)
            autoCount += 1
          } else if (saved === 'needs-period') {
            reviews.push(reviewFromAuto(plan.expense, notice.origin))
          }
        }
        if (alive) showReviews(reviews)
        if (autoCount === 1) toast.success('Gasto de Mercado Pago registrado')
        if (autoCount > 1) toast.success(`${autoCount} gastos de Mercado Pago registrados`)
      } finally {
        running.current = false
      }
    }

    void tick()
    const timer = window.setInterval(() => void tick(), POLL_MS)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [userId])

  const advance = () => {
    const [next, ...rest] = waitingRef.current
    waitingRef.current = rest
    modalRef.current = next ?? null
    setWaiting(rest)
    setModal(next ?? null)
  }

  const confirm = async (result: MercadoPagoPromptResult) => {
    if (!modal) return
    const period = periodForMercadoPagoNotice(periods, modal.postedAt, selectedPeriod)
    if (!period) {
      toast.error('No hay un mes donde guardar el gasto')
      return
    }
    setBusy(true)
    rememberMercadoPagoApplied(userId, modal.externalId)
    try {
      await createExpense({
        periodId: period.id,
        accountType: result.accountType,
        category: result.category,
        description: result.description,
        originalAmount: result.amount,
        originalCurrency: result.currency,
        customExchangeRate: result.customExchangeRate,
      })
      await ackMercadoPagoNotice(userId, { id: modal.noticeId, origin: modal.origin })
      toast.success('Gasto de Mercado Pago registrado')
      advance()
    } catch (error) {
      forgetMercadoPagoApplied(userId, modal.externalId)
      toast.error(getErrorMessage(error, 'No se pudo registrar el gasto'))
    } finally {
      setBusy(false)
    }
  }

  const dismiss = async () => {
    if (!modal) return
    setBusy(true)
    rememberMercadoPagoApplied(userId, modal.externalId)
    try {
      await dismissMercadoPagoNotice(userId, { id: modal.noticeId, origin: modal.origin })
      advance()
    } finally {
      setBusy(false)
    }
  }

  if (!modal) return null

  return (
    <MercadoPagoExpensePrompt
      review={modal}
      settings={settings}
      busy={busy}
      onConfirm={(result) => void confirm(result)}
      onDismiss={() => void dismiss()}
    />
  )
}

async function saveAuto(
  userId: string,
  expense: MercadoPagoAutoExpense,
  periods: Period[],
  selectedPeriod: Period | null,
  createExpense: (input: CreateExpenseInput) => Promise<unknown>,
): Promise<'saved' | 'needs-period' | 'failed'> {
  const period = periodForMercadoPagoNotice(periods, expense.postedAt, selectedPeriod)
  if (!period) return 'needs-period'
  const detail = expense.detail.trim()
  rememberMercadoPagoApplied(userId, expense.externalId)
  try {
    await createExpense({
      periodId: period.id,
      accountType: expense.accountType,
      category: expense.category,
      description: detail ? normalizeCustomCategoryName(detail).slice(0, 40) : null,
      originalAmount: expense.amount,
      originalCurrency: expense.currency,
      customExchangeRate: null,
    })
    return 'saved'
  } catch (error) {
    forgetMercadoPagoApplied(userId, expense.externalId)
    toast.error(getErrorMessage(error, 'No se pudo registrar el gasto'))
    return 'failed'
  }
}

function reviewFromAuto(
  expense: MercadoPagoAutoExpense,
  origin: MpNotice['origin'],
): ReviewItem {
  return {
    noticeId: expense.noticeId,
    externalId: expense.externalId,
    kind: 'payment',
    amount: expense.amount,
    currency: expense.currency,
    detail: expense.detail,
    accountType: expense.accountType,
    category: expense.category,
    customName: expense.customName,
    postedAt: expense.postedAt,
    origin,
  }
}
