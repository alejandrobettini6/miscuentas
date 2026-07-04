import { useEffect, useState } from 'react'
import { offlineQueue } from '@/repositories/offline/OfflineQueue'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const sync = () => {
      setIsOnline(navigator.onLine)
      setPendingCount(offlineQueue.pendingCount())
    }

    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    const interval = window.setInterval(sync, 2000)

    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
      window.clearInterval(interval)
    }
  }, [])

  return { isOnline, pendingCount }
}
