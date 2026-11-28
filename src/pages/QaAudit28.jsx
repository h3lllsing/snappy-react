import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Report + approved changes register — 2026-11-28. No rows/hashes/keys/secrets. */
const ITEMS = [
  {
    id: 1, title: 'Session + nayein rules', status: 'PASS',
    evidence: 'HANDOFF padha, rules dohraye. Rule 12 (production audit tables me koi DELETE/UPDATE nahi, test traffic marker se alag) aur rule 13 (har edit se pehle .bak/git commit, baad me diff) HANDOFF me add kiye. Khud verify: health ok, df 20G used/74G avail, services active, sync_enabled=1 sirf 803/804. CONTEXT >=98% — naya session kholein.',
    next: 'Naye session me pehle docs/HANDOFF.md.',
  },
  {
    id: 2, title: 'A1 — mailbox_activity / ops_events / nginx', status: 'PASS',
    evidence: 'mailbox_activity total 28, sab rotation (27 Nov 21:57:42) se pehle (max created 2026-11-27 20:43:10), baad me **0**. Browser 28 Nov 07:52–07:53 ke waqt ops_events **0** rows. nginx /api/webmail/activity: rotation ke baad **47x403, 1x200, 0x204**; pehle 28x204, 5x200, 1x401; koi 5xx nahi. Matlab plugin activity requests rotation ke baad reject ho rahi thin.',
    next: '—',
  },
  {
    id: 3, title: 'A2 — verification variants + binlog', status: 'PASS',
    evidence: 'Variants matrix (created_at plain/tz/fractional × prev stored/recomputed × file/env/old key): ids 81–83 **file=yes, old=yes, env=no** jab timestamp plain aur prev stored tha; fractional seconds par sab no; recomputed prev par 82/83 no. Pehla A1 untrimmed file key ki wajah se false negative tha — trim karne par purana key match karta hai. Binlog INSERT: 81=26 Nov 23:09:15, 82=27 Nov 17:58:47, 83=27 Nov 20:45:07. 27 Nov 22:13:16 ke 6 DELETEs ids 84–89, sabka domain `local` (test users). tools/workers/tests ke SOURCE me `DELETE FROM login_audits`/`LoginAudit::delete` nahi mila (sirf task/log text me zikr).',
    next: '—',
  },
  {
    id: 4, title: 'A3 — ENVELOPE ground truth', status: 'PASS',
    evidence: 'Real upstream 803+804, 48 UIDs, read-only UID FETCH ENVELOPE vs column: address-only comparison **48/48** har address field (from/sender/reply_to/to/cc/bcc); date 48/48, cc 48/48, in_reply_to 48/48, message_id 48/48; subject 44/48 (4 format/decode diffs). 50 raw rows par builder vs independent CLI parser (koi network nahi): subject/cc/bcc/in_reply_to/message_id **50/50**, date 37/50, from/sender/reply_to 40/50, to 37/50 — independent parser ke saath 100% equality nahi mili; differences sirf field naam/ginaye, content nahi.',
    next: 'Agar independent parser parity chahiye to alag task.',
  },
  {
    id: 5, title: 'B1 — backend local git', status: 'PASS',
    evidence: 'DB dump pehle. `git init` (local, **remote 0**), .gitignore: .env*, storage/, *.bak*, portal-audit.key, bodies, attachments, vendor, node_modules + webmail logs/configs/cache/storage. Secrets scan: staged secret-ish names **0**, real-secret value files **0**, generic keyword wale staged files 9 (placeholder/doc). Initial commit **a53cb8f**; diff .gitignore shown.',
    next: '—',
  },
  {
    id: 6, title: 'B2 — audit key single source', status: 'PASS',
    evidence: 'DB dump + transient .bak. `services.portal_audit_key` authoritative; portal-audit.key file ko us value se regenerate (trim, 640 masood:www-data), hash match yes. Purana key ab sirf rotation backup me (transient .bak verify ke baad hata diya). Verify-chain smoke + runbook step added (diff shown). Test (UA marker `audit28-cli-test`, SSO session): **valid signature 204**, galat signature **403**; mailbox_activity id 77 actor_id 454 account_id 803 source snappy_plugin, UA marker yes — koi delete/update nahi.',
    next: '—',
  },
  {
    id: 7, title: 'B3 — chain code (purani rows untouched)', status: 'PASS',
    evidence: 'DB dump; .bak + diff for `LoginAudit.php`, `VerifyAuditChain.php`, `config/services.php`. Naye rows ke liye v2 versioned payload + `lockForUpdate()` transaction; verify-chain multi-version (v2 current, v1 current+previous keys, legacy unkeyed); `PORTAL_AUDIT_PREVIOUS_KEYS` rotation backup se set (value print nahi). verify-chain: **OK 0, LEGACY 0, KEYED_V1 31, BROKEN 0** (pehle 3 broken the). Tests **227/227**. BODY[] integrity: pehla run 789 TimeoutError (daemon healthy 4 workers, 0 established), turant retry **1032/1032, 0 failures** — transient client timeouts honestly recorded. Backend commit **b73a940**. Append-only trigger + go-live checkpoint sirf design, apply nahi.',
    next: 'Trigger/checkpoint ke liye owner review.',
  },
  {
    id: 8, title: 'C + D — staging plan + HANDOFF', status: 'PASS',
    evidence: 'C: `docs/GATE1-PLAN.md` me local staging Dovecot design — reboot window ke baad, 127.0.0.1 pehli start se pehle, pop3/lmtp band, hidden brand `staging`, soft-only cleanup; install nahi kiya (.bak + diff). D: HANDOFF me rules 12/13, Audit 28 approved/applied, report findings, verification note aur open items add kiye (.bak + diff).',
    next: 'Gate 1 window me staging setup.',
  },
]

export default function QaAudit28() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 28' }]} />
      <PageHeader title="Q&A AUDIT 28" subtitle="Audit key single source · versioned chain · backend git · envelope ground truth · koi secret/hash/row value nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>8 PASS · Context >=98% — naya session kholein.</strong> verify-chain 0 broken, 227 tests, 1032/1032 integrity (retry). Production GO nahi — Gate 1 abhi NOT TESTED.
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
