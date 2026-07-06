import { useApp } from '../hooks/useAppState.jsx'
import { IconCheck, IconX } from './Icons.jsx'

export default function ToastContainer() {
  const { state } = useApp()
  if (state.toasts.length === 0) return null

  return (
    <div className="toast-container">
      {state.toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <IconCheck />}
          {t.type === 'error'   && <IconX />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
