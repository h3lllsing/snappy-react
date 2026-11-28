import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Gate 0 → Gate 1 evidence register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: 'Workflow doc sahi karo — SnappyMail SMTP claim wapas liya', status: 'PASS',
    evidence: '`docs/SIGNOFF.md` outgoing/reverse-push rows qualified; `docs/FINAL-GO-NO-GO.md` AUDIT6 addendum (lines ~491-500) lists every previous PASS claim that depended on SnappyMail SMTP: "exactly-once proven", "sent reply in real Sent immediately", "send hook proves webmail send", "no duplicate delivery verified" — sab **QUALIFIED / NOT PROVEN** until real E2E. `WorkflowGuide.jsx` section 04 English/Roman Urdu/Urdu corrected; grep "exactly-once proven" → 0. FE commit `ac0ed41`.',
    next: 'Koi nahi — E2E tests ne ab real proof diya (Q3 niche).',
  },
  {
    id: 2, title: 'Loopback SMTP relay implement (127.0.0.1:2525 only)', status: 'PASS',
    evidence: '`smtp-relay/server.php` + `app/Support/SmtpGuard.php` + unit `alphaspace-smtp-relay.service` (active, enabled). Listener `127.0.0.1:2525` (ss). `config/smtp-relay.php`: 10 sends/5min, 200 rcpt/day, 80% warning, 10 MiB cap. MAIL FROM + From: dono session mailbox se match (553). Upstream host/port/encryption **DB se** (`mail.alphatach.com:587/tls`), domain JSON loopback par pin (`snappy:generate-domains --check` PASS). Upstream fail par 451 (silent queue nahi). Header allow-list (Bcc/injected headers drop), metadata-only logs. `php artisan smtp:relay-check` → `active host=127.0.0.1 port=2525`. Tests 139/139.',
    next: 'Relay down alert (Q7 owner values ke baad) aur monthly health check.',
  },
  {
    id: 3, title: '7 real end-to-end tests (test mailboxes, ek hi window)', status: 'PASS',
    evidence: 'T1 normal: 2 recipients → INBOX 803=1, INBOX 804=1, local Sent=1, real Sent=1 (Message-ID se verify). T2 can_send=0 → SMTP 535, copies=0. T3 revoke ke baad → 535, copies=0 (revoke status 200). T4 rate-limit (send_limit=2 override) → 3rd send SMTP 452 4.7.1. T5 upstream 587 REJECT (iptables, rule trap se hata) → raw AUTH reply `451 4.4.1 Upstream SMTP unavailable`. T6 From spoof `attacker@example.net` → 553 5.7.1, copies=0. T7 header injection `Subject: hello\\r\\nBcc: injected@...` → delivered, par injected Bcc header **present nahi**. Sab real SMTP path se, unit/mock se nahi.',
    next: 'Gate 1 E2E evidence ke liye ye tests record me rehte hain.',
  },
  {
    id: 4, title: 'Gate 1 inventory — read-only LIST, owner mailbox list ka intezaar', status: 'NOT STARTED',
    evidence: 'Owner ne mailboxes `sync_enabled=0` ke saath add karne hain. `docs/GATE1-PLAN.md` me item 1 ab folder discovery inventory hai (sirf IMAP LIST/XLIST read-only; koi write/sync nahi). Table columns: provider type, INBOX prefix style, SPECIAL-USE, Sent/Drafts/Trash/Spam names, mapping status. Abhi 2 reference rows (803/804) code-level hain; live LIST nahi chalaya.',
    next: 'Aap mailbox list dein → main read-only LIST se table bharunga; koi sync enable nahi karunga.',
  },
]

export default function QaAudit6() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 6' }]} />
      <PageHeader title="Q&A AUDIT 6" subtitle="Loopback relay + 7 real E2E tests + doc corrections · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>3 PASS · 1 NOT STARTED.</strong> SnappyMail se real SMTP send ab proven hai. Gate 1 sirf owner mailbox list ke baad.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status === 'PASS' ? 'success' : 'warning'}>{item.status}</Badge>
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
