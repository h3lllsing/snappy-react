import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Report + approved envelope change register — 2026-11-28. No rows/hashes/secrets. */
const ITEMS = [
  {
    id: 1, title: 'Session start + context', status: 'PASS',
    evidence: 'HANDOFF padha, 11 NON-NEGOTIABLE RULES dohraye. Khud verify: health ok (db/cache/queue/imap true, queue 0); df 98G/20G used/74G avail; nginx/mysql/redis/php8.3-fpm + fake-imap/queue/smtp active; sync_enabled=1 sirf 803/804, koi cap override nahi. CONTEXT >=98% — naya session kholein.',
    next: 'Naye session me pehle docs/HANDOFF.md padhein.',
  },
  {
    id: 2, title: 'A1 — do keys se verify (sirf yes/no)', status: 'PASS',
    evidence: 'Ids 81, 82, 83 ko (a) `storage/app/private/portal-audit.key` file key se aur (b) `.env` PORTAL_AUDIT_KEY se HMAC verify kiya: teeno ke liye **file_key_match=no, env_key_match=no**. Koi key/hash/row value print nahi kiya. Matlab Audit 26 wali "sirf key mismatch" wali hypothesis poori nahi hai — rows kisi aur payload/key variant se aaye hain ya manually insert hue.',
    next: 'A4 conditional approval trigger NAHI hua → chain code changes nahi kiye.',
  },
  {
    id: 3, title: 'A2 — kaun padhta hai key?', status: 'FAIL',
    evidence: 'Env key: `config/services.php` → `app/Models/LoginAudit.php` (HMAC write) aur `app/Http/Controllers/Api/WebmailActivityController.php` (HMAC verify). File key: `public/webmail/data/_data_/_default_/plugins/portal-audit/index.php` (line ~408–413) **sign karta hai** `portal-audit.key` se. Dono alag key sources hain → plugin dwara sign kiye gaye webhook events controller me verify fail honge. Ye rotation ka **incomplete hissa** hai (report-only; fix nahi kiya).',
    next: 'Aapki ijazat se single key source + plugin update.',
  },
  {
    id: 4, title: 'A3 — login_audits gaps (timestamps/counts only)', status: 'PASS',
    evidence: 'Binlog scan: `DELETE FROM login_audits` 40 statements 25–26 Nov (19:36, 19:47, 20:37, 22:38, 22:43 etc.), 6 statements 27 Nov 22:13:16 — 83 ke baad 90 tak ka gap isi se match karta hai. Code me koi retention/prune job nahi mila; users → login_audits par FK CASCADE nahi (FK rules: NO ACTION/CASCADE/SET NULL sirf brands, email_account_user, team_user, teams, users par); users_total=6 with_trashed=6 → hard user delete nahi. Sudo history me manual `DELETE FROM login_audits` nahi mila (sirf restore-drill scratch DB commands). Actor definitive nahi mila — rows/hashes dobara nahi likhe.',
    next: 'Agar zarurat ho to binlog se exact operator audit alag task.',
  },
  {
    id: 5, title: 'A4 — design only (code changes nahi)', status: 'PASS (design)',
    evidence: 'Proposed: (a) append-only enforcement — DB grants/trigger jo `login_audits` aur `mailbox_activity` par UPDATE/DELETE roke (production trigger sirf owner review ke baad); (b) hash payload me `key_version`; (c) insert serialization `DB::transaction()` + `lockForUpdate()`; (d) ek hi key source (plugin + controller + model); (e) rotation runbook me `audit:verify-chain` smoke; (f) re-anchor checkpoint — pre-rotation verified chain ka digest naye key se signed, verify-chain usse `ANCHORED` count me le. **Condition (A1 me purana key se match) false thi → key_version/lock/multi-key code AUHI NAI KIYA.**',
    next: 'Aap chain-fix approve karein to alag round.',
  },
  {
    id: 6, title: 'B — APPROVED envelope column + backfill', status: 'PASS',
    evidence: 'Pehele DB dump `db_pre_audit27_envelope_20261128-160550.sql.gz`. Migration `add_envelope_to_emails` (nullable column), `Email` fillable, ingest `SyncAccountEmailsJob` me `MimeParser::fromRaw()->envelope()` (wohi builder), daemon `getEnvelope()` column-first + NULL fallback, resumable `emails:backfill-envelopes`. Backfill: **scanned=1034, written=1034, skipped=0, failed=0**. Full equality (sample nahi): **1034/1034 match, 0 mismatch, 0 unavailable**. 20-UID page with ENVELOPE: **48.3 / 53.0 / 52.4 ms** (<100 ms target). INTERNALDATE received_at, ENVELOPE date Date: header se, FLAGS DB se. Tests **223/223**, BODY[] integrity **1032/1032**, health OK. .bak gap: only `ImapProtocol.php.bak.20261128-160842`; `SyncAccountEmailsJob.php` aur `Email.php` bina pre-change .bak ke edit hue (backend git nahi) — honest note.',
    next: 'Aap browser test karein (uid 14 / 1171 / 1172 + attachment sha256).',
  },
  {
    id: 7, title: 'C — Gate 1 staging Dovecot design (install nahi)', status: 'PASS (design)',
    evidence: 'Laptop par chhota Dovecot: bind **127.0.0.1 only**, alag port (fake IMAP 1143 aur SMTP 2525 se alag), test mailboxes `*.example.test`, koi internet nahi. Current: dovecot installed **nahi**; RAM 15 GiB total / **7.4 GiB available**, disk 74 GiB free. Estimate (NOT TESTED): ~50–100 MB RAM, test mail data kuch MB. Security: loopback-only bind, alag OS user, test credentials (production .env/credentials koi nahi), firewall reachability verify, cleanup plan. Tests: UIDVALIDITY badal kar mirror reset, `INBOX.` vs `/` separator mappings, SPECIAL-USE/XLIST flags, UIDPLUS (UID EXPUNGE) support, 2 real IMAP/SMTP integration runs, exactly-one-copy. Install/execute nahi kiya.',
    next: 'Gate 1 maintenance window me owner install/verify karega.',
  },
  {
    id: 8, title: 'D — HANDOFF update', status: 'PASS',
    evidence: 'HANDOFF.md me Audit 26–27 summary: envelope migration/backfill/equality/timing/.bak gap, chain A1–A4 findings (do keys se no, file-vs-env plugin mismatch, binlog deletes, design only), staging design, aur open items (Gate 1 6 items NOT TESTED, Q1 804, Gate 1 list, 45-mail delete approval, alerts degraded, sudoers line, audit chain 3 broken, manifest 404, browser test). Context >=98%.',
    next: 'Compaction ke baad pehle HANDOFF padhein.',
  },
]

export default function QaAudit27() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 27' }]} />
      <PageHeader title="Q&A AUDIT 27" subtitle="Chain verify/design · envelope column applied · Gate 1 staging design · report only except approved B · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <strong>7 PASS · 1 FAIL (A2: file key vs env key mismatch) · Context >=98% — naya session kholein.</strong> Envelope column 1034/1034 equality, 223 tests, 1032/1032 integrity. Production GO nahi.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status.startsWith('PASS') ? 'success' : 'danger'}>{item.status}</Badge>
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
