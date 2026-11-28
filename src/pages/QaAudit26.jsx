import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Report-only register — 2026-11-28. No rows/hashes/secrets repeated, no changes. */
const ITEMS = [
  {
    id: 1, title: 'Session start + context', status: 'PASS',
    evidence: 'HANDOFF padha, 11 NON-NEGOTIABLE RULES dohraye. Khud verify: health ok (db/cache/queue/imap true, queue 0); df 98G/20G used/74G avail; nginx/mysql/redis/php8.3-fpm + fake-imap/queue/smtp active; sync_enabled=1 sirf 803/804, koi cap override nahi. CONTEXT >=98% — naya session kholein.',
    next: 'Naye session me pehle docs/HANDOFF.md padhein.',
  },
  {
    id: 2, title: 'REPORT (1) — audit chain diagnosis', status: 'PASS',
    evidence: 'Table **login_audits**; naya scheme `HMAC-SHA256(previous|event|email|ip|created_at)` with `services.portal_audit_key`, purana LEGACY scheme plain SHA-256 (VerifyAuditChain dono accept karta hai). Broken rows: id 81 (2026-11-26 23:09:15, login_success), id 82 (2026-11-27 17:58:47, login_success), id 83 (2026-11-27 20:45:07, login_success) — sabme self_ok=no, legacy_ok=no, ok_with_recomputed_prev=no → **self-hash mismatch** (sirf prev_hash nahi). Neighbors 80 aur 84 **maujood hi nahi** (table ids 81..133, gaps: 84–89 bhi nahi); agla existing 90. Timelines: teeno **rotation (27 Nov 21:57:42) se pehle**, baad ki 26 rows OK; pre_rotation_rows=3/post_rotation_rows=26. Root cause: rotation me `.env` ka PORTAL_AUDIT_KEY badla (current config key hash ≠ rotation backup me purana key hash), par `storage/app/private/portal-audit.key` file **purana key** rakhta hai (file hash = rotation backup key hash). Restore drills 26 Nov 22:54/23:15/00:03 timestamps 81 ke paas hain; scratch DB me login_audits manual insert ka koi sudo evidence nahi (sirf meri grep). Writer `LoginAudit::creating()` me `orderByDesc(id)->value(hash_chain)` hai — **koi DB::transaction / lockForUpdate nahi** → concurrent writers ka race possible. Koi row touch nahi kiya, hash values yahan nahi likhe.',
    next: 'Neeche (a)/(b) proposals — implement nahi.',
  },
  {
    id: 3, title: 'Proposals (a) re-anchor, (b) future fix', status: 'PASS (design)',
    evidence: '(a) **Documented re-anchor event**: ek signed checkpoint row (event `audit_reanchor`, key-version + previous-chain digest + timestamp) jise `audit:verify-chain` explicitly recognize kare — purane key se likhi gayi chain ko "broken" na gin kar `ANCHORED` count me le; checkpoint khud current key se HMAC. Owner sign-off ke saath docs me reason/date likhna zaroori. (b) **Future fix**: (i) insert ko `DB::transaction()` + `lockForUpdate()` ya singleton DB lock ke saath serialize karo (race khatam), (ii) hash payload me `key_version` field add karo taaki rotation ke baad purane rows apne version se verify ho, (iii) rotation runbook me portal-audit.key file + .env dono ek saath update + post-rotation `audit:verify-chain` smoke. Koi code/DB change nahi kiya.',
    next: 'Aapki likhi ijazat se implement.',
  },
  {
    id: 4, title: 'REPORT (2) — ENVELOPE metadata vs fromRaw (20 UIDs)', status: 'PASS',
    evidence: '20 sample UIDs (non-ASCII subject 754 me se, 15 Reply-To; is dataset me Cc/multi-recipient nahi). Exact field match: bcc 20/20 **yes**; subject 19/20; date 7/20; from/sender/reply_to/to/message_id 0/20; cc 18/20; in_reply_to 15/20. Formatting-insensitive (quotes/brackets/case hata kar) match: from, sender, reply_to, in_reply_to, message_id **yes 20/20**; subject 19/20; bcc 20/20; **to 0/20**; cc 18/20; date 7/20. To me 8 cases me metadata zyada recipients, 12 me raw zyada (sets alag — formatting nahi). Cc ke 2 cases me metadata NIL par raw set (real gap). Subject 1 case raw zyada (encoded-word decode). Date 13 cases me received_at ≠ raw Date header — **INTERNALDATE bhi yahi 7/20 match** (metadata received_at authority hai). **FLAGS**: raw MIME parser me flag concept hi nahi (grep 0) — fromRaw se comparison **NOT TESTED / not comparable**; sample 20 sab `is_read=1`, flagged/draft 0. Content kahi nahi likha gaya, sirf field naam/ginaye.',
    next: 'Agar UI me To/Cc/Date dikhte hain to in 4 gaps par alag fix design chahiye.',
  },
  {
    id: 5, title: 'REPORT (3) — Gate 1 missing items', status: 'PASS (table)',
    evidence: 'Neeche Gate 1 ke 6 items + Q1 804 transient ka status table. Sab **NOT TESTED** jab tak owner maintenance window/list de. Accounts=2 (803/804) → koi throwaway staging mailbox nahi; `/var/run/reboot-required` set, reboot nahi hua; external SPF/DKIM/DMARC HANDOFF me "Not done". Real upstream read/relay partial evidence hai par plan ke staging criteria ke saath match nahi.',
    next: 'Gate 1 window me inhe execute karo; "Production GO" abhi nahi.',
  },
]

const GATE1 = [
  ['1 Folder discovery inventory (3 providers, XLIST/STATUS)', 'NOT TESTED', 'owner mailbox list nahi; accounts=2 (803,804)'],
  ['2 Reboot test (units + health + 2 LOGIN)', 'NOT TESTED', 'reboot-required set; controlled reboot nahi hua'],
  ['3 UIDVALIDITY change on throwaway mailbox', 'NOT TESTED', 'koi staging/*.example.test mailbox nahi'],
  ['4 Two real IMAP/SMTP integration tests (staging)', 'NOT TESTED', 'real 803/804 par partial upstream read + relay send hua; staging test nahi'],
  ['5 Exactly-one-copy + external Gmail/Outlook SPF/DKIM/DMARC', 'NOT TESTED', 'HANDOFF: External SPF/DKIM/DMARC test = Not done'],
  ['6 \\Seen reverse sync (webmail ↔ real server)', 'NOT TESTED', 'STORE handler code hai; real two-way test nahi'],
  ['Q1 804 transient (5 failures, localhost)', 'NOT TESTED', 'trigger unconfirmed; command-level connlog installed'],
]

export default function QaAudit26() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 26' }]} />
      <PageHeader title="Q&A AUDIT 26" subtitle="Audit-chain root cause · ENVELOPE field equality · Gate 1 gaps · report only · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>5 PASS · Context >=98% — naya session kholein.</strong> Audit chain 3 broken rows ka root cause: audit HMAC key .env me badla, key file purana. Koi row/hash change nahi kiya. Production GO nahi.
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
      <Card>
        <CardBody>
          <h2 className="mb-2 text-sm font-semibold">Gate 1 missing items (readiness table me nahi the)</h2>
          <div className="space-y-1 font-mono text-[11px]">
            {GATE1.map(([name, status, ev]) => (
              <div key={name} className="flex flex-wrap gap-x-2 rounded border border-border px-2 py-1">
                <span className="min-w-[280px] font-semibold">{name}</span>
                <Badge tone="warning">{status}</Badge>
                <span className="text-muted">{ev}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
