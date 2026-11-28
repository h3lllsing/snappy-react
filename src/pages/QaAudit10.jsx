import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Follow-up register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: 'sync_max_mb derived default ab fixed hai?', status: 'PASS',
    evidence: 'Pehele `SyncBudget::maxMbFor()` har call par live `disk_free_space()` se calculate karta tha. Ab `config/sync.php` me fixed: `max_mb=48`, `max_mb_derived_at=2026-11-28` (calculation: 80 GiB free ×0.6 ÷1000 planned ≈48 MB/mailbox). Live verify: `default1=48 default2=48 config=48 derived_at=2026-11-28` — bar-bar call karne par bhi 48, live disk se nahi badalta.',
    next: 'planned_accounts badalne par naya derived value compute karke config me likhna padega.',
  },
  {
    id: 2, title: 'Recent phase alert + disk throttle (naya mail kabhi block nahi)', status: 'PASS',
    evidence: 'Config: `recent_alert_mb=150`, `disk_throttle_percent=80`, `recent_throttle_limit=10`. recent_mb threshold cross par ek deduped ops_event `mail.recent_mb_high` per mailbox/day. Disk>=80% par recent phase 10 newest tak throttle, lekin UID > recent watermark wala naya mail hamesha fetch/mirror hota hai. REAL TEST: runtime `recent_alert_mb=1` ke saath job chalaya → `recent_high_events=2`. tests 165/165 (RecentThrottleTest: alert, throttle+new UID, normal disk, never-block).',
    next: 'Production me threshold 150 MB review karein; Q7 alert channel se real delivery owner karega.',
  },
  {
    id: 3, title: 'B4: email_bodies migration + raw gz + backup/hash check', status: 'PASS',
    evidence: 'OPTIONS (100 real rows): A) raw+parsed DB = 176.23+210.5 MB ≈387 MB. B) parsed DB + raw gz on disk = 210 MB DB + **0.98 MB disk** (99.4% saving), gz roundtrip 1845 ms/100 ≈18.5 ms/msg. C) parsed-only = 210 MB par original raw nahi → reparse/replay impossible. RECOMMENDED + IMPLEMENTED: B. Backup pehle: `/var/backups/alphaspace/db_pre_bodies_20261128.sql.gz` 11.7 MB, gzip OK, chmod 600. Backfill: `1032 candidates, 1032 migrated, 0 failed`; raw bytes 226,804,917 → 10,568,503 (**216 MB saved**); `emails=1032, email_bodies=1032, legacy_raw=0`; sample hash_ok=yes. Real FETCH: `BODYSTRUCTURE` 20 msgs 56.8 ms; `BODY[]` 55,336 bytes 10.4 ms. Fake-IMAP + queue workers restart, FPM reload; health 200.',
    next: 'Real mailbox onboarding se pehle schema ready hai; body table growth monitor karein.',
  },
  {
    id: 4, title: 'failed_jobs 49/50 aur sync_runs 974-978 — retry ya record? UID gap?', status: 'PASS',
    evidence: 'failed_jobs 49/50 (22:23, IMAP connection failed) **sirf record** hue — individual retry nahi hua; baaki fresh `sync_runs` ne catch-up kiya. Purane failure window me 5 failed runs (974-978) the; uske baad success. LIVE compare: 803 real INBOX EXISTS=981 / UID 1180, local mirror count=981 / max UID 1180; 804 real EXISTS=18 / UID 19, local count=18 / max UID 19 → **koi gap nahi**. Recent watermark 803 INBOX=1179 hai par local max UID 1180 (recent phase usse aage track karta hai) — missing mail nahi.',
    next: 'failed_jobs records no-delete rule ke karan rahenge; daily prune retire karega.',
  },
  {
    id: 5, title: 'Gate 1 taiyari — koi mailbox add / sync enable nahi', status: 'PASS (waiting)',
    evidence: 'Owner ne abhi mailbox list nahi di; maine koi naya `email_accounts` row add nahi kiya aur kisi ka `sync_enabled` change nahi kiya. Existing flags: 803=1, 804=1 (pehle se active). `docs/GATE1-PLAN.md` me item 1 read-only inventory taiyar hai (LIST/XLIST, koi write nahi). Health 200, 165/165 tests, open_issues=0.',
    next: 'Aap mailbox list dein → read-only inventory; tabhi Gate 1 sequence.',
  },
]

export default function QaAudit10() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 10' }]} />
      <PageHeader title="Q&A AUDIT 10" subtitle="Config freeze · recent throttle · bodies migration · failure gap check · Gate 1 ready" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>5 PASS.</strong> Naye mailboxes abhi bhi nahi add kiye — Gate 1 aapki list ka intezaar kar raha hai.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone="success">{item.status}</Badge>
                  <span className="text-sm font-semibold">Q{item.id}. {item.title}</span>
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
