import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'
import { OfflineOperationStatus, OfflineOperationType } from '@/types/enums'
import type { OfflineOperation } from '@/types/models'
import { createId } from '@/utils/id'
import { logger } from '@/utils/logger'

/**
 * Cola offline persistente.
 * En modo local las operaciones se aplican de inmediato; la cola queda lista
 * para sincronizar cuando VITE_DATA_MODE=supabase.
 */
export class OfflineQueue {
  list(): OfflineOperation[] {
    return readJson<OfflineOperation[]>(STORAGE_KEYS.OFFLINE_QUEUE, [])
  }

  enqueue(type: OfflineOperationType, payload: unknown): OfflineOperation {
    const operation: OfflineOperation = {
      id: createId(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      status: OfflineOperationStatus.PENDING,
      attempts: 0,
      lastError: null,
    }
    const all = this.list()
    all.push(operation)
    writeJson(STORAGE_KEYS.OFFLINE_QUEUE, all)
    return operation
  }

  remove(id: string): void {
    writeJson(
      STORAGE_KEYS.OFFLINE_QUEUE,
      this.list().filter((op) => op.id !== id),
    )
  }

  markFailed(id: string, error: string): void {
    const all = this.list().map((op) =>
      op.id === id
        ? {
            ...op,
            status: OfflineOperationStatus.FAILED,
            attempts: op.attempts + 1,
            lastError: error,
          }
        : op,
    )
    writeJson(STORAGE_KEYS.OFFLINE_QUEUE, all)
  }

  pendingCount(): number {
    return this.list().filter((op) => op.status === OfflineOperationStatus.PENDING).length
  }

  clear(): void {
    writeJson(STORAGE_KEYS.OFFLINE_QUEUE, [])
  }

  logPending(): void {
    const count = this.pendingCount()
    if (count > 0) {
      logger.info(`Operaciones pendientes de sincronización: ${count}`)
    }
  }
}

export const offlineQueue = new OfflineQueue()
