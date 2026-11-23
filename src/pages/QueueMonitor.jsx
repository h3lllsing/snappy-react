import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw, Search, Trash2, Zap } from 'lucide-react'
import {
  Badge, Button, Card, CodeBlock, EmptyState, Input, PageHeader,
  StatCard, Table, Td, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

export default function QueueMonitor() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [pending, setPending] = useState(0)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([api.failedJobs(), api.opsSummary()])
      .then(([j, s]) => { if (alive) { setJobs(j); setPending(s?.queue_depth || 0) } })
      .catch(() => { if (alive) toast('Could not load the queue.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [toast])

  const filtered = useMemo(() => jobs.filter(j =>
    !query || `${j.job} ${j.queue} ${j.error}`.toLowerCase().includes(query.toLowerCase()),
  ), [jobs, query])

  const toggle = id => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const retry = async job => {
    try {
      await api.retryJob(job.id)
      setJobs(prev => prev.filter(j => j.id !== job.id))
      setExpanded(prev => prev.filter(x => x !== job.id))
      setPending(p => p + 1)
      toast(`${job.job} was requeued.`, 'success', { title: 'Job retried' })
    } catch {
      toast('Could not retry this job.', 'error', { title: 'Retry failed' })
    }
  }

  const remove = job => {
    setJobs(prev => prev.filter(j => j.id !== job.id))
    setExpanded(prev => prev.filter(x => x !== job.id))
    toast(`${job.job} removed from the failed list.`, 'warning', { title: 'Job removed' })
  }

  const retryAll = async () => {
    if (!jobs.length) { toast('There are no failed jobs to retry.', 'info', { title: 'Queue clear' }); return }
    setBusy(true)
    try {
      const results = await Promise.all(jobs.map(async j => {
        try { await api.retryJob(j.id); return { id: j.id, ok: true } }
        catch { return { id: j.id, ok: false } }
      }))
      const succeeded = results.filter(r => r.ok).map(r => r.id)
      const failed = results.length - succeeded.length
      if (succeeded.length) {
        setJobs(prev => prev.filter(j => !succeeded.includes(j.id)))
        setExpanded(prev => prev.filter(id => !succeeded.includes(id)))
        setPending(p => p + succeeded.length)
      }
      if (failed) {
        toast(`${succeeded.length} requeued, ${failed} could not be retried.`, 'warning', { title: 'Retry all partial' })
      } else {
        toast(`${jobs.length} failed job${jobs.length === 1 ? '' : 's'} requeued across the sync queue.`, 'success', { title: 'Retry all complete' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Queue Monitor"
        subtitle="Inspect failed background jobs and requeue sync work without a restart."
        actions={<>
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search jobs…" className="pl-9 w-56" />
          </div>
          <Button onClick={retryAll} loading={busy}><RotateCcw size={15} /> Retry All</Button>
        </>}
      />

      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <StatCard label="Pending jobs" value={pending} icon={Zap} tone="indigo" sub="Awaiting a worker in the sync queue" />
        <StatCard label="Failed jobs" value={jobs.length} icon={RotateCcw} tone="red" sub={jobs.length ? 'Require attention' : 'Queue is healthy'} />
      </div>

      <div className="sm:hidden mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search jobs…" className="pl-9" />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-app">
          <h3 className="font-semibold">Failed jobs</h3>
          <Badge variant={jobs.length ? 'danger' : 'success'} dot>{jobs.length ? `${jobs.length} failed` : 'All clear'}</Badge>
        </div>
        <Table className="min-w-[800px]">
          <thead><tr>
            <Th>Job</Th><Th>Queue</Th><Th>Failed At</Th><Th>Error preview</Th><Th className="text-right">Actions</Th>
          </tr></thead>
          <tbody>
            {filtered.map(j => {
              const open = expanded.includes(j.id)
              return (
                <Fragment key={j.id}>
                  <Tr>
                    <Td>
                      <button onClick={() => toggle(j.id)} className="flex items-center gap-2 text-left font-semibold hover:text-indigo-500">
                        {open ? <ChevronDown size={14} className="text-indigo-500" /> : <ChevronRight size={14} className="text-muted" />}
                        {j.job}
                      </button>
                    </Td>
                    <Td><Badge variant="primary">{j.queue}</Badge></Td>
                    <Td className="text-xs text-muted whitespace-nowrap">{j.failed_at}</Td>
                    <Td className="max-w-[280px]"><span className="text-xs text-red-500 truncate block">{j.error}</span></Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => retry(j)}><RotateCcw size={13} /> Retry</Button>
                        <Button size="sm" variant="ghost" title="Remove" onClick={() => remove(j)}><Trash2 size={14} className="text-red-500" /></Button>
                      </div>
                    </Td>
                  </Tr>
                  {open && (
                    <Tr className="bg-surface-2/50">
                      <td colSpan={5} className="px-5 py-4 border-b border-app/70">
                        <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Exception payload</p>
                        <CodeBlock>{j.error}</CodeBlock>
                        <div className="flex gap-4 mt-2 text-[11px] text-muted">
                          <span>Job ID: <span className="font-mono">#{j.id}</span></span>
                          <span>Queue: <span className="font-mono">{j.queue}</span></span>
                          <span>Attempts: <span className="font-mono">3 / 3</span></span>
                        </div>
                      </td>
                    </Tr>
                  )}
                </Fragment>
              )
            })}
            {filtered.length === 0 && <EmptyState icon={Zap} title="No failed jobs" message={query ? 'Try a different search term.' : 'The queue is running smoothly right now.'} colspan={5} />}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
