import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Evidence + plan register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: 'IMAP_WORKERS ek hi source (unit/CLI/alerts)', status: 'PASS',
    evidence: '`.env:76 IMAP_WORKERS=4` ab single source hai; systemd unit me inline `Environment=` hata kar `EnvironmentFile=/home/masood/REACT-snappy/backend/.env` (deploy template bhi). `AlertsWatch` ab `env("IMAP_WORKERS",4)` padhta hai. LIVE: unit active, 4 daemon PIDs, `imap_busy=0 established=0 workers=4`, health 200. Tests 188/188.',
    next: '—',
  },
  {
    id: 2, title: 'Concurrency model: 4 workers kitte connections sambhalte hain?', status: 'PASS',
    evidence: 'Test: 4 authenticated connections hold karke 7wi par login + chhoti mail fetch → login **91.7 ms**, fetch **47.8 ms**; 6 hold karke phir 7wi → login **92.4 ms**, fetch **47.4 ms** — koi atak nahi. Matlab har worker ek connection nahi, balki `stream_select` se kai connections multiplex karta hai (server.php accept loop). Isliye 4 workers = 4 event loops, ~ unlimited concurrent idle sockets (FD cap 8192). 7wi connection par koi queue/block nahi hai — zyada workers/add event loop ki zarurat nahi. Q1 ke 5 failures is model se bhi explain nahi hote (open item rahega).',
    next: 'Agar kabhi FD saturation ho to LimitNOFILE 8192 pehle already set hai; tab design option: per-worker client cap.',
  },
  {
    id: 3, title: 'Fake IMAP metadata connection log + 7-day retention', status: 'PASS',
    evidence: '`imap-connections-2026-11-28.jsonl` mode 600, flock append, 4 workers se safe. Sample record keys: `ts, worker_id, account_id, auth_result, duration_ms, bytes_in, bytes_out, close_reason` — **email/subject/body/credential nahi**. Sample: `worker_id=4, account_id=803, auth_result=ok, duration_ms=48, close_reason=logout`. Daemon start + hourly par 7 din purane files delete. Command `imap:connlog --hours=24`. Tests 188/188.',
    next: 'Agli transient failure par is log se exact close_reason milega.',
  },
  {
    id: 4, title: 'sync_max_mb after LVM extend — hisaab (config me nahi likha)', status: 'PASS',
    evidence: 'Formula `(free_disk × 0.6) / planned_accounts`. Abhi config fixed 48 MB (derived_at 2026-11-28). LVM +100 GiB ke baad VG free ~135.42 → **35.42 GiB**: planned 800 → **27.2 MB/mailbox**, planned 1000 → **21.8 MB/mailbox**. Note: LVM extend se free kam hota hai, isliye cap BADHEGA nahi, **kamega** — configuration tab owner authorization par update hogi. Koi config/file change nahi kiya.',
    next: 'planned_accounts confirm + LVM ke baad hi config update (ijazat se).',
  },
  {
    id: 5, title: '43 test mails ka cleanup plan', status: 'PASS (plan only)',
    evidence: '`docs/TEST-MAIL-CLEANUP-PLAN.md`: backup → dry-run counts → upstream IMAP scoped delete (Message-ID se, folder/account verify, EXPUNGE sirf un UIDs) → mirror scoped delete (emails + email_bodies + gz + attachment refcount) → UID gap check → canary/SSO/health. Rollback: scratch DB se counts compare; upstream delete rollback nahi, isliye owner approval zaroori. **Abhi delete nahi kiya** — aap browser check karenge pehle.',
    next: 'Aapki ijazat ke baad hi execute.',
  },
  {
    id: 6, title: 'Network/LVM/reboot plan — addenda', status: 'PASS (plan only)',
    evidence: '`docs/NETWORK-LVM-REBOOT-PLAN.md` me add: Wi-Fi `wlp4s0` band (fallback nahi, split-brain se bachne ke liye), nginx IP bind + `After=network-online.target` check, LVM extend ke baad VG free ≈**35.42 GiB** (135.42−100), `apt-get upgrade --force-confold` + 23-package review list (php8.3, postgresql-18, mysql/nginx/redis dependencies), `netplan try` pehle. Execute sirf jab aap bolein aur laptop ke saamne hon. Koi command nahi chalaya.',
    next: 'Gate 1 reboot window me, owner present me execute.',
  },
]

export default function QaAudit14() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 14' }]} />
      <PageHeader title="Q&A AUDIT 14" subtitle="Env alignment · concurrency model · connection log · LVM math · cleanup/plan docs · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>6 PASS.</strong> Q1 (804 transient) open item rahega — blocker nahi. Koi mailbox/sync add nahi kiya.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone="success">{item.status}</Badge>
                  <span className="text-sm font-semibold">{item.id}. {item.title}</span>
                </div>
                <div className="whitespace-pre-wrap font-mono text-xs text-muted">Saboot: {item.evidence}</div>
                <div className="mt-1 text-xs">Agla qadam: {item.next}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
