import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Browser-test report only — 2026-11-28. No change, no secrets. */
const ITEMS = [
  {
    id: 1, title: 'Fake IMAP connlog — UID 1181 asli SnappyMail sequence', status: 'PASS',
    evidence: 'Pichle 30 min me 83 records, uid=1181 wale **13**. Browser test (07:52–07:53): (A) 07:52:34 `LOGIN 5ms → CAPABILITY 0 → EXAMINE 18ms → UID FETCH uid=1181 section=BODYSTRUCTURE 353B/66ms → UID FETCH uid=1181 resp=1299B/306ms → LOGOUT`, duration 613 ms, close_reason **logout**. (B) 07:52:47 aur 07:53:46 dono: `LOGIN 2ms → CAPABILITY 0 → EXAMINE 10–20ms → UID FETCH uid=1181 section=2.MIME resp=246B/138–149ms → UID FETCH uid=1181 section=2 resp=11,479,241B/110–114ms → LOGOUT`, duration 417/424 ms, close_reason **logout**. (C) 07:26 group: `LOGIN → CAPABILITY → STATUS → SELECT → SORT → UID FETCH 1181 section=BODYSTRUCTURE resp=24413B/2.2–2.5 s → LOGOUT` — ye message-list preload hai (SORT + multi-UID BODYSTRUCTURE), koi timeout/abort nahi. SnappyMail ke apne log me yahi commands TAG4/TAG5 ke saath dikhte hain.',
    next: '—',
  },
  {
    id: 2, title: 'nginx access/error + php-fpm logs', status: 'PASS',
    evidence: 'Custom log format `alphaspace_combined` me **request_time field nahi** — isliye request time NOT TESTED. 07:52:21–22: 6× POST `/webmail/?/Json/` 200 (85–407 B) + 1× **499** (browser ne request close kiya, preload ke dauran). 07:52:25 MessageList 200 / 4053 B. 07:52:34 `GET /webmail/?/Json/.../Message/...` → **200 / 993 B**. 07:52:49 aur 07:53:49 `GET /webmail/?/Raw/.../Download/...` → **200 / 8,389,903 B** aur **200 / 8,389,916 B**. Nginx error log 07:52–07:54: **0 entries**; php-fpm error log: **0 entries**; php-fpm slowlog configured nahi (www.conf me commented).',
    next: '—',
  },
  {
    id: 3, title: 'SnappyMail apne logs', status: 'PASS',
    evidence: '`data/_data_/_default_/logs/log-2026-11-28.txt` (1.6 M, last write 07:53) me 07:5x ke **438 entries**, jinme ERROR/EXCEPTION/timeout = **0**. 07:52:34 Message open: BODYSTRUCTURE 44 B plain + application part, `TAG5 UID FETCH 1181 (... BODY.PEEK[HEADER.FIELDS ...] ... BODY[1] {44})` OK, `No RFC 2822 date to parse` (INFO), peak memory 2 MB, time delta 0.637 s. 07:53:46 download: `UID FETCH 1181 (BODY.PEEK[2.MIME])` 155 B/0.19 s, `UID FETCH 1181 (BODY.PEEK[2])` 11,479,150 B, callback `feof = good`, peak memory **16.02 MB**, time delta **0.436 s**, LOGOUT success. Purane 27 Nov ke `AuthError[102]` entries is window me nahi hain.',
    next: '—',
  },
  {
    id: 4, title: 'Token id 76 + portal token expiry', status: 'PASS',
    evidence: '`personal_access_tokens` id **76 exist karta hai** — expires_at **2026-11-28 11:00:43** (abhi future), revoked column table me hai hi nahi → delete/expire **NO**. Table me 25 PAT, sabke expires_at set, 2 expired. Portal tokens: `webmail_tokens` 13 rows, sabme expires_at set, 13 expired (single-use); `webmail_sessions` 28 rows, sabme expires_at set, 6 expired. Token text kabhi print nahi kiya.',
    next: 'Agar id 76 rotate karna ho to alag likhi ijazat chahiye.',
  },
  {
    id: 5, title: 'Root cause + next test', status: 'PASS',
    evidence: 'Browser test **成功**: mail open 0.64 s, attachment download HTTP 200 (8.39 MB body), IMAP BODY.PEEK[2] 110 ms, SnappyMail peak 16 MB, koi error nahi. Purana P0 bug (timeout + attachment option na aana) ab reproduce nahi hua — Audit 16 ka partial-section chunked stream fix asli UI path par bhi kaam kar raha hai. Cheez jo abhi verify nahi hui: download ki **sha256 original (433c16c5…d53c) se match** — browser me save karke user ko confirm karna hai. Nginx body_bytes_sent 8,389,903/8,389,916 vs raw 8,388,608 — extra ~1.3 KB chunked-transfer overhead ho sakta hai; saved file ka actual sha256 hi final saboot hoga. Koi fix nahi kiya.',
    next: 'Aap downloaded file ka sha256 bhejein; mismatch aaye to Raw/Download streaming decode check karenge.',
  },
  {
    id: 6, title: 'Pichhle prompt ke (a)-(d) — short recap', status: 'PASS',
    evidence: '(a) mysqldumpslow: email_bodies/emails INSERT + upsert (1.2–3.5 s avg) aur SELECT * full scans (5.2/3.3 s) — zyadatar migration/restore-drill; existing indexes adequate, naya index nahi. (b) binlog: 7d ~35 GiB/PITR 7 d; 2–3d ~10–15 GiB; MINIMAL moderate gain (NOT TESTED); off = 0 GiB par PITR khatam, RPO ~24 h — recommendation 7d rakhein, off nahi. (c) Disk plan: /var/lib/mysql, backups, bodies/, attachments/, /tmp/opencode track; 80% `disk.space_low` Q7 ke baad; har mailbox ke baad growth row. (d) Worker disable/enable commands likhe gaye, chalaye nahi. Sab report-only.',
    next: 'Koi change nahi kiya.',
  },
]

export default function QaAudit22() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 22' }]} />
      <PageHeader title="Q&A AUDIT 22" subtitle="Browser test evidence · koi change nahi · koi secret nahi · context ~98%" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>6 PASS · Context ~98% — naya session kholein.</strong> P0 bug UI me reproduce nahi hua; downloaded file ka sha256 abhi baaki.
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
