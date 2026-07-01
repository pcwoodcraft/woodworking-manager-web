import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback((msg, type = 'ok') => {
    clearTimeout(timer.current)
    setToast({ msg, type })
    if (type !== 'err') {
      timer.current = setTimeout(() => setToast(null), 3500)
    }
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className={'toast toast-' + toast.type} role="alert">
          <span className="toast-msg">{toast.msg}</span>
          {toast.type === 'err' && (
            <button type="button" className="toast-dismiss" onClick={dismiss}>Rozumiem</button>
          )}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
