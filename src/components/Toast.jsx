import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const show = useCallback((msg, type = 'ok') => {
    clearTimeout(timer.current)
    setToast({ msg, type })
    timer.current = setTimeout(() => setToast(null), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div className={'toast toast-' + toast.type}>{toast.msg}</div>}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
