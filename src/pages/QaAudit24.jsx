import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Verify + report-only register — 2026-11-28. No secret values. */
const ITEMS = [
  {
    id: 1, title: 'Session start + context', status: 'PASS',
    evidence: 'HANDOFF padha, 11 NON-NEGOTIABLE RULES dohraye. Khud verify: health ok (db/cache/queue/imap true, queue 0); df 98G/20G used/74G avail; nginx/mysql/redis/php-fpm + fake-imap/queue/smtp active; sync_enabled=1 sirf 803/804, koi cap override nahi. CONTEXT >=98% — naya session kholna zaroori.',
    next: 'Naye session me pehle docs/HANDOFF.md padhein.',
  },
  {
    id: 2, title: 'Sudoers verify — FAIL (line abhi bhi hai)', status: 'FAIL',
    evidence: 'Aapne bataya ki NOPASSWD line hata di — par `sudo -l` abhi bhi dikhta hai: `(root) NOPASSWD: /home/masood/REACT-snappy/tools/harden-config-cache.sh`, aur source `/etc/sudoers.d/opencode-config-cache:1`. `sudo -n /home/.../harden-config-cache.sh` **password ke bina chal gaya** (output: Hardened:, rc=1 script ki .env.bak glob se aata hai, sudo se nahi). Koi secret nahi. **Aapko yahi line dobara visudo se hatani hogi** — main sudoers file nahi chhupaya (report-only). Achhi khabar: rebuild-config.sh/run-tests.sh ab is helper ko call nahi karte — `rebuild-config.sh` OK (640 masood:www-data), `run-tests.sh` 201/201 PASS, prod config sha256 before=after=ae232c78…516ee.',
    next: 'Aap `/etc/sudoers.d/opencode-config-cache` se line 1 remove karein, phir `sudo -n` dobara test.',
  },
  {
    id: 3, title: 'REPORT (1) — sudo hisaab 48 h', status: 'PASS',
    evidence: '48h window (26–28 Nov) me state-changing sudo: mysqldump×2 (audit20/23 dumps), chmod 600 bodies-drill.tsv + chmod 2770 scratch (audit21), cp×3 backups (audit21/23), sed reads, systemctl reload nginx×2 + php8.3-fpm×1 (approved), touch/chown/chmod slowlog + reload (audit23 approved), chmod 2750 bootstrap/cache (audit23 approved). **netplan: 0** — aapke bataye 12 commands 16 Nov ke hain (window se bahar, kisi approved audit task ka hissa nahi). **ufw: 8, sab `status`** (read-only; abhi bhi Status active, sirf 22/80/443). **psql: 1, read-only** `SELECT datname ...` (26 Nov 22:31); baaki 15 psql 18–19 Nov ke hain. netplan config sha256 abhi `b64606f1…6ec1`, `.backup` aur `.disabled` dono `4db2423b…f6b` — 16 Nov se koi netplan change nahi. `pg_lsclusters`: 18/main **5432 down**. ⚠️ Security note: purane (18–19 Nov) psql sudo commands me DB role passwords plaintext the — meri pehli extraction me wo mask nahi hue the (galti); aage sab masked. Agar wo credentials abhi valid hain to rotation recommend (abhi change nahi). Koi approved task se na match karne wali 48h command: **nahi mili** (16 Nov wale netplan/ufw setup is conversation se pehle ke hain).',
    next: 'Purane psql credentials rotate karna ho to alag likhi ijazat.',
  },
  {
    id: 4, title: 'REPORT (2) — message-list preload breakdown', status: 'PASS',
    evidence: 'SnappyMail session b01f54b0 (07:52:22–25) ne **sirf 20 UIDs** maange: `UID FETCH 1181,1180,…,1162 (UID RFC822.SIZE INTERNALDATE FLAGS BODYSTRUCTURE …)`. Response 24,413 B (≈1.2 KB/UID), MessageList Time delta **2.47 s**. SQL nahi: `loadBodyStructures()` 5 batches × 200, 982 ids, **7.9 ms**; EXPLAIN e=PRIMARY range, b=PRIMARY eq_ref. body_structure NULL/empty sirf **3** rows (1034 me se) — zyadatar stored string hai, `BodyStructureBuilder::fromRaw()` nahi chalta. Asli wajah: RFC822.SIZE request ki wajah `structureOnlyFetch=false` → `loadBodies()` poori raw field + raw_path select karta hai aur 9/12 MiB gz ko memory me decompress karta hai (BodyStore::readRaw: 92 ms + 127 ms). Saboot: 20 UIDs full attrs **1215 ms**, 9 chhote UIDs full attrs **52 ms**, 20 UIDs `(UID BODYSTRUCTURE)` sirf **57 ms**, 2 bade UIDs full attrs 320 ms. Per-UID bade wale page me ~60 ms, normal page ~5.8 ms; per-page 20 UIDs ≈1.2 s. Purana 12.6/50.4 s projection (2.47 s × n/981) mixed-layer tha — **wapas liya**: structure-only server path ~1.3 ms/UID → 5k ≈6.5 s / 20k ≈26 s; SnappyMail full-attrs path normal pages ~5.8 ms/UID (5k≈29 s/20k≈116 s) aur bade mails wale pages ~60 ms/UID. Real 5k/20k mailbox NOT TESTED.',
    next: 'Fix design (ijazat se): BODYSTRUCTURE-only fetch me raw na load karein, ya RFC822.SIZE ko metadata column se serve karein.',
  },
  {
    id: 5, title: 'REPORT (3) — MAX_FETCH_MESSAGES=1000', status: 'PASS',
    evidence: '`getFolderOrderedIds()` → `ORDER BY uid ASC`, aur `array_slice($targetUids,0,1000)` — matlab `FETCH 1:*` sabse **purane/oldest 1000** UIDs deta hai, naye 1000 nahi. Live 803 INBOX: EXISTS 982 < cap → 982 UIDs (uid 1..1181) milin. In-memory SQLite model (koi file nahi likhi, production untouched): n=1500 → EXISTS 1500, FETCH 1:* cap = uid 1..1000 (1000), ranged 1001:1500 = 500, SORT total 1500; n=5000 → cap 1..1000, ranged 500, SORT 5000. SnappyMail pagination/sort **sahi chalta hai** kyunki wo SORT ke baad explicitly 20 UIDs mangta hai (upar Q4) — cap se unaffected. Sirf naive `FETCH 1:*` clients ko 1000 se zyada nahi milte. Design propose (implement nahi): (a) client ko UID-range pagination (100–500) bhejein, (b) cap ko newest-first ya configurable banayein, (c) per-page fetch — SnappyMail wala (c) pehle se hai.',
    next: 'Aapki ijazat se cap/pagination design badlein — abhi nahi.',
  },
  {
    id: 6, title: 'REPORT (4) — HANDOFF update', status: 'PASS',
    evidence: 'HANDOFF.md me Audit 21–24 summary add: approved/applied (PAT 76 delete, nginx timing, slowlog 660 accepted, config-cache 2750 + umask 0137, sudo-free rebuild), open items (manifest fix, cap design, Q1 804, Gate 1 list, reboot window, 45-mail delete approval, alert values, sudoers line abhi bhi present), aur aaj ke (1)-(3) findings. Context notice >=98%.',
    next: 'Compaction ke baad pehle HANDOFF padhein.',
  },
]

export default function QaAudit24() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 24' }]} />
      <PageHeader title="Q&A AUDIT 24" subtitle="Sudoers verify + report-only sudo/list/cap findings · koi change nahi · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
            <strong>5 PASS · 1 FAIL (Q2: NOPASSWD line abhi bhi maujood) · Context >=98% — naya session kholein.</strong> Sudoers maine nahi badla (report-only). Tests 201/201, config sha256 unchanged.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status === 'PASS' ? 'success' : 'danger'}>{item.status}</Badge>
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
