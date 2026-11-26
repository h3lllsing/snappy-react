import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Info, Loader2, X } from 'lucide-react'

const cx = (...s) => s.filter(Boolean).join(' ')

/* ---------- Button ---------- */
const VARIANTS = {
  primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20',
  secondary: 'surface-2 border border-app text-[var(--text)] hover:border-indigo-400',
  danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500',
  success: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500',
  ghost: 'text-[var(--muted)] hover:surface-2 hover:text-[var(--text)]',
  outline: 'border border-indigo-500/60 text-indigo-500 hover:bg-indigo-500/10',
}
const SIZES = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm', icon: 'p-2' }

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/60', VARIANTS[variant], SIZES[size], className)}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
}

/* ---------- Card ---------- */
export function Card({ className = '', children, ...rest }) {
  return <div {...rest} className={cx('surface border border-app rounded-2xl shadow-sm', className)}>{children}</div>
}
export function CardHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={cx('flex items-start justify-between gap-4 px-5 py-4 border-b border-app', className)}>
      <div>
        {title && <h3 className="font-semibold text-[var(--text)]">{title}</h3>}
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}
export function CardBody({ className = '', children }) { return <div className={cx('p-5', className)}>{children}</div> }

/* ---------- PageHeader ---------- */
export function PageHeader({ title, subtitle, backTo, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        {backTo && <button onClick={backTo} className="text-xs text-indigo-500 hover:underline mb-1">← Back</button>}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

/* ---------- Badge ---------- */
const BADGES = {
  default: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  enabled: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  suspended: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  paused: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  expired: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  disabled: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  danger: 'bg-red-500/10 text-red-500 border-red-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
  info: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  primary: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  pending: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  syncing: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
}
const ROLE_BADGES = { 'super-admin': 'danger', admin: 'primary', 'team-lead': 'info', user: 'default' }
export function Badge({ variant = 'default', role, dot = false, className = '', children }) {
  const v = role ? ROLE_BADGES[role] || 'default' : variant
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap', BADGES[v] || BADGES.default, className)}>
      {dot && <span className={cx('w-1.5 h-1.5 rounded-full bg-current', dot === 'live' && 'animate-pulse-dot')} />}
      {children}
    </span>
  )
}

/* ---------- StatusDot ---------- */
export function StatusDot({ status }) {
  const colors = { active: 'bg-emerald-500', connected: 'bg-emerald-500', ok: 'bg-emerald-500', suspended: 'bg-amber-500', paused: 'bg-amber-500', error: 'bg-red-500', offline: 'bg-slate-500', pending: 'bg-sky-500', idle: 'bg-slate-500' }
  return <span className={cx('inline-block w-2 h-2 rounded-full', colors[status] || 'bg-slate-400')} title={status} />
}

/* ---------- Avatar ---------- */
export function Avatar({ name = '', size = 'md' }) {
  const initials = String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-12 h-12 text-sm' : 'w-9 h-9 text-xs'
  return <span className={cx('inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold shrink-0', sz)}>{initials}</span>
}

/* ---------- Form fields ---------- */
export function Field({ label, required, hint, error, children, className = '' }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="block text-xs font-semibold text-muted mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>}
      {children}
      {error ? <span className="block text-[11px] text-red-500 mt-1">{error}</span> : hint ? <span className="block text-[11px] text-muted mt-1">{hint}</span> : null}
    </label>
  )
}
const inputCls = 'w-full rounded-xl border border-app surface-2 px-3 py-2 text-sm text-[var(--text)] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition'
export function Input({ error, className = '', ...rest }) { return <input {...rest} className={cx(inputCls, error && 'border-red-500', className)} /> }
export function Select({ error, className = '', children, ...rest }) { return <select {...rest} className={cx(inputCls, error && 'border-red-500', className)}>{children}</select> }
export function Textarea({ error, className = '', rows = 4, ...rest }) { return <textarea rows={rows} {...rest} className={cx(inputCls, 'resize-y', error && 'border-red-500', className)} /> }
export function Checkbox({ label, description, className = '', ...rest }) {
  return (
    <label className={cx('flex items-start gap-2.5 cursor-pointer', className)}>
      <input type="checkbox" {...rest} className="mt-0.5 w-4 h-4 accent-indigo-600 rounded" />
      <span>
        {label && <span className="block text-sm font-medium">{label}</span>}
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  )
}

/* ---------- Alert ---------- */
export function Alert({ type = 'info', title, children, onClose, className = '' }) {
  const map = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
    error: 'border-red-500/30 bg-red-500/10 text-red-500',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-500',
  }
  return (
    <div className={cx('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', map[type] || map.info, className)}>
      {type === 'warning' && <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
      <div className="flex-1">{title && <div className="font-semibold">{title}</div>}{children}</div>
      {onClose && <button onClick={onClose}><X size={15} /></button>}
    </div>
  )
}

/* ---------- EmptyState ---------- */
export function EmptyState({ icon: Icon, title = 'Nothing here yet', message, colspan }) {
  const content = (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {Icon && <div className="w-12 h-12 rounded-2xl surface-2 border border-app flex items-center justify-center text-muted mb-3"><Icon size={22} /></div>}
      <p className="font-semibold">{title}</p>
      {message && <p className="text-sm text-muted mt-1 max-w-sm">{message}</p>}
    </div>
  )
  return colspan ? <tr><td colSpan={colspan}>{content}</td></tr> : content
}

/* ---------- Table ---------- */
export function Table({ children, className = '', minWidth = true }) {
  return (
    <div className="overflow-x-auto border border-app rounded-xl surface">
      <table className={cx('w-full text-sm', minWidth && 'min-w-[720px]', className)}>{children}</table>
    </div>
  )
}
export function Th({ children, className = '', onClick, sort }) {
  return <th onClick={onClick} className={cx('px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted font-semibold border-b border-app whitespace-nowrap', onClick && 'cursor-pointer hover:text-indigo-500', className)}>{children}{sort && <span className="ml-1 text-indigo-500">{sort}</span>}</th>
}
export function Td({ children, className = '' }) { return <td className={cx('px-4 py-3 border-b border-app/70 last:border-0 align-middle', className)}>{children}</td> }
export function Tr({ children, className = '', ...rest }) { return <tr {...rest} className={cx('row-hover transition-colors', className)}>{children}</tr> }

/* ---------- Pagination ---------- */
export function Pagination({ page = 1, lastPage = 1, total = 0, from = 0, to = 0, onPage }) {
  if (lastPage <= 1) return <div className="text-xs text-muted mt-3">Showing {total} result{total === 1 ? '' : 's'}</div>
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-muted">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={15} /></Button>
        {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onPage(p)} className={cx('w-8 h-8 rounded-lg text-xs font-semibold', p === page ? 'bg-indigo-600 text-white' : 'surface-2 border border-app hover:border-indigo-400')}>{p}</button>
        ))}
        <Button size="icon" variant="secondary" disabled={page >= lastPage} onClick={() => onPage(page + 1)}><ChevronRight size={15} /></Button>
      </div>
    </div>
  )
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 surface-2 border border-app rounded-xl w-fit mb-5">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} className={cx('px-4 py-1.5 rounded-lg text-xs font-semibold transition', active === t.key ? 'bg-indigo-600 text-white shadow' : 'text-muted hover:text-[var(--text)]')}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('surface border border-app rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-up', w)}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-app">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-[var(--text)]"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-4 border-t border-app">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Confirm dialog ---------- */
export function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onClose, danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm?.(); onClose?.() }}>{confirmLabel}</Button>
    </>}>
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  )
}

/* ---------- Toast system ---------- */
const MAX_VISIBLE_TOASTS = 4
const TOAST_META = {
  success: { accent: 'border-l-emerald-500', icon: Check, iconClass: 'text-emerald-500', ring: 'focus:ring-emerald-500/60' },
  error: { accent: 'border-l-red-500', icon: AlertTriangle, iconClass: 'text-red-500', ring: 'focus:ring-red-500/60' },
  warning: { accent: 'border-l-amber-500', icon: AlertTriangle, iconClass: 'text-amber-500', ring: 'focus:ring-amber-500/60' },
  info: { accent: 'border-l-sky-500', icon: Info, iconClass: 'text-sky-500', ring: 'focus:ring-sky-500/60' },
}

const clearToastTimer = (timers, id) => {
  const record = timers.get(id)
  if (!record) return
  if (record.timeout) clearTimeout(record.timeout)
  timers.delete(id)
}

const pauseToastTimer = (timers, id) => {
  const record = timers.get(id)
  if (!record || !record.timeout) return
  clearTimeout(record.timeout)
  record.remaining = Math.max(0, record.remaining - (Date.now() - record.startedAt))
  record.timeout = null
  timers.set(id, record)
}

const ToastCtx = createContext(null)
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toastsRef = useRef([])
  const timersRef = useRef(new Map())
  const nextIdRef = useRef(0)
  const apiRef = useRef({})

  // One commit path keeps the rendered stack and the ref in sync, and drops
  // timers belonging to toasts pushed out of the visible four.
  const commit = useCallback((next) => {
    const visible = next.slice(-MAX_VISIBLE_TOASTS)
    const keep = new Set(visible.map(t => t.id))
    timersRef.current.forEach((_, id) => { if (!keep.has(id)) clearToastTimer(timersRef.current, id) })
    toastsRef.current = visible
    setToasts(visible)
  }, [])

  const dismiss = useCallback((id) => {
    clearToastTimer(timersRef.current, id)
    commit(toastsRef.current.filter(t => t.id !== id))
  }, [commit])

  const dismissAll = useCallback(() => {
    timersRef.current.forEach(record => { if (record.timeout) clearTimeout(record.timeout) })
    timersRef.current.clear()
    toastsRef.current = []
    setToasts([])
  }, [])

  const pause = useCallback((id) => pauseToastTimer(timersRef.current, id), [])

  const resume = useCallback((id) => {
    const timers = timersRef.current
    const record = timers.get(id)
    if (!record || record.timeout || !Number.isFinite(record.remaining)) return
    record.startedAt = Date.now()
    record.timeout = setTimeout(() => {
      timers.delete(id)
      apiRef.current.dismiss(id)
    }, record.remaining)
    timers.set(id, record)
  }, [])

  apiRef.current = { dismiss }

  // push stays callable exactly as before (push(message, type, extra)) and
  // also carries the controller methods used for dedupe and logout cleanup.
  const push = useCallback((message, type = 'success', extra = {}) => {
    const rawKey = extra.dedupeKey ?? extra.id
    const key = rawKey !== undefined && rawKey !== null ? String(rawKey) : null
    const existing = key !== null
      ? toastsRef.current.find(t => t.key === key)
      : null
    if (existing) {
      commit(toastsRef.current.map(t => t.id === existing.id ? {
        ...t, ...extra, id: t.id, key: t.key, message, type, count: (t.count || 1) + 1,
      } : t))
      return existing.id
    }

    const id = extra.id != null ? String(extra.id) : `toast-${++nextIdRef.current}`
    const duration = extra.duration ?? (type === 'error' ? 10000 : 4000)
    const sticky = Boolean(extra.persistent || extra.action)
    if (!sticky && duration > 0) {
      const timeout = setTimeout(() => {
        timersRef.current.delete(id)
        apiRef.current.dismiss(id)
      }, duration)
      timersRef.current.set(id, { timeout, remaining: duration, startedAt: Date.now() })
    }
    commit([...toastsRef.current, { ...extra, id, key, message, type, count: 1 }])
    return id
  }, [commit])

  useEffect(() => () => {
    timersRef.current.forEach(record => { if (record.timeout) clearTimeout(record.timeout) })
    timersRef.current.clear()
  }, [])

  const toast = useMemo(
    () => Object.assign(push, { dismiss, dismissAll, pause, resume }),
    [push, dismiss, dismissAll, pause, resume],
  )

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[300] flex max-h-[calc(100vh-2rem)] w-[min(380px,calc(100vw-2rem))] flex-col gap-2 overflow-y-auto"
        role="region" aria-label="Notifications">
        {toasts.slice(-MAX_VISIBLE_TOASTS).map(t => {
          const meta = TOAST_META[t.type] || TOAST_META.info
          const Icon = meta.icon
          return (
            <div key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => resume(t.id)}
              onFocus={() => pause(t.id)}
              onBlur={() => resume(t.id)}
              className={cx('pointer-events-auto animate-toast-in glass rounded-xl shadow-2xl p-3.5 flex items-start gap-3 border-l-4', meta.accent)}>
              <Icon size={16} className={cx('mt-0.5 shrink-0', meta.iconClass)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {t.title && <p className="text-sm font-semibold">{t.title}</p>}
                  {t.count > 1 && <span className="rounded-full surface-2 px-1.5 py-0.5 text-[10px] font-bold text-muted">×{t.count}</span>}
                </div>
                <p className="text-xs text-muted">{t.message}</p>
                {t.action && (
                  <button type="button" onClick={() => { t.action.onClick(); dismiss(t.id) }}
                    className={cx('mt-1.5 text-xs font-semibold hover:underline focus:outline-none focus:ring-2', meta.ring)}>
                    {t.action.label} →
                  </button>
                )}
              </div>
              <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}
                className={cx('p-1.5 rounded-lg text-muted hover:surface-2 hover:text-[var(--text)] focus:outline-none focus:ring-2', meta.ring)}>
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {toasts.map(t => `${t.title ? `${t.title}: ` : ''}${t.message}${t.count > 1 ? ` (×${t.count})` : ''}`).join(' ')}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

/* ---------- Loading overlay ---------- */
export function LoadingOverlay({ show, message = 'Loading…' }) {
  if (!show) return null
  return <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm flex items-center justify-center"><div className="surface border border-app rounded-2xl px-6 py-4 flex items-center gap-3 shadow-2xl"><Loader2 className="animate-spin text-indigo-500" size={18} /><span className="text-sm font-medium">{message}</span></div></div>
}

/* ---------- StatCard ---------- */
export function StatCard({ label, value, icon: Icon, tone = 'indigo', sub, to, onClick }) {
  const tones = { indigo: 'text-indigo-500 bg-indigo-500/10', emerald: 'text-emerald-500 bg-emerald-500/10', amber: 'text-amber-500 bg-amber-500/10', red: 'text-red-500 bg-red-500/10', sky: 'text-sky-500 bg-sky-500/10' }
  const inner = <>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted font-medium">{label}</p>
        <p className="text-3xl font-bold mt-2 tracking-tight">{value ?? '—'}</p>
        {sub && <p className="text-[11px] text-muted mt-1">{sub}</p>}
      </div>
      {Icon && <div className={cx('w-10 h-10 rounded-xl flex items-center justify-center', tones[tone])}><Icon size={19} /></div>}
    </div>
  </>
  const cls = 'surface border border-app rounded-2xl p-5 stat-glow card-hover text-left w-full'
  return to ? <a href={to} className={cls}>{inner}</a> : <button onClick={onClick} className={cls}>{inner}</button>
}

/* ---------- misc ---------- */
export function Divider({ label }) {
  if (!label) return <hr className="border-app my-5" />
  return <div className="flex items-center gap-3 my-5"><hr className="flex-1 border-app" /><span className="text-[11px] text-muted uppercase tracking-wider">{label}</span><hr className="flex-1 border-app" /></div>
}
export function CodeBlock({ children }) { return <pre className="surface-2 border border-app rounded-xl p-3 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">{children}</pre> }
export function CheckIcon() { return <Check size={14} className="text-emerald-500" /> }
