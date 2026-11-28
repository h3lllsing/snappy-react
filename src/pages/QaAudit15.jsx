import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Diagnostic-only register — 2026-11-28. No fix, no config/DB/file change. */
const ITEMS = [
  {
    id: 1, title: 'Reproduce: verb-level IMAP trace + close_reason', status: 'NOT TESTED',
    evidence: '`imap:connlog` metadata log (59 records): close_reason `logout=33, timeout=23, client_eof=3`; timeouts sab account 803, worker 2/3/4, `bytes_in=685`, `bytes_out≈2,589,859`, `duration≈120 s` — yani client ne chhota command bheja, server ne ~2.47 MB bhejkar atak gaya. Lekin current connection log me **command type / UID / section field nahi hai** (metadata-only design), isliye verb-level trace nikalna possible nahi tha. SnappyMail HTTP API (`AppData`, `MessageList`) SSO cookie ke saath bhi HTML shell return kar raha hai (XToken/routing resolve nahi hua) → browser/API reproduce **NOT TESTED**. Koi fix nahi kiya.',
    next: 'Agli debug iteration me command-level trace add karna padega (abhi rule: no file change).',
  },
  {
    id: 2, title: 'BODYSTRUCTURE: migration ke baad sahi?', status: 'PASS',
    evidence: 'Pre-migration dump (`db_pre_bodies_20261128.sql.gz`) ko scratch DB me restore karke 3 attachment wali mails (ids 8017, 8045, 8059) ka `BodyStructureBuilder::fromRaw()` output current `email_bodies.body_structure` se compare: **har ek ka length aur sha256 match** (1332/1332, 474/474, 476/476). Structure me `attachment` disposition aur `name` params maujood hain (names mask kiye). Live fake IMAP par uid 14 (Invoice PDF) `BODYSTRUCTURE` 55 ms me aaya. Scratch DB drop kiya; production untouched.',
    next: '—',
  },
  {
    id: 3, title: 'Partial fetch paths par latency (9/12 MiB)', status: 'FAIL',
    evidence: 'Fresh connection par: `BODYSTRUCTURE` 51.8 ms, `BODY[HEADER.FIELDS(SUBJECT)]` 51.7 ms (22 B), `BODY[1.MIME]` 239.9 ms (620 B), `BODY[]<0.65536>` 176.7 ms (65,536 B), **BODY.PEEK[1] → TimeoutError after 60 s**, `BODY.PEEK[2]` 275.4 ms (0 B), `BODY[]` 207.3 ms (9.8 MB), `BODY[]` uid 1172 248.7 ms (13.1 MB). Streamed full-body path fast hai, par **partial section path abhi bhi poora raw/MIME parse karke single write karta hai** (`ImapProtocol.php:3824,3888-3890,4091-4095,4115`). Ye "Request timed out" ka actual source hai. Chhoti mail (323 KB) par koi timeout nahi.',
    next: 'Fix (agla window, ijazat se): partial paths ko bhi chunked stream karo.',
  },
  {
    id: 4, title: 'Attachment download path', status: 'PASS (partial)',
    evidence: 'SnappyMail `Actions/Attachments.php:157-170` → `MessageMimeStream(..., mimeIndex)` — yani IMAP `BODY.PEEK[<n>]` / `BODY.PEEK[<n>.MIME]` se part fetch. Live uid 14 (PDF attachment): `BODY.PEEK[1]` 9384 B / 52 ms, `BODY.PEEK[2]` 17004 B / 51 ms, `BODY.PEEK[2.MIME]` 151 B / 52 ms — download path data sahi serve kar raha hai. **Lazy >5 MB path abhi exercise nahi hua** (`email_attachments` me 0 rows >5 MB). UI me attachment option na aane ka reason BODYSTRUCTURE se nahi dikha (structure sahi hai) — browser confirmation baaki.',
    next: 'Aap browser me attachment menu verify karein; agar phir bhi na aaye to UI-side hook check karenge.',
  },
  {
    id: 5, title: 'Timeout chain — kaun pehle fire hota hai?', status: 'NOT TESTED',
    evidence: 'PHP-FPM `max_execution_time=30`, `memory_limit=128M`; NGINX `fastcgi_read_timeout 300–360 s`; SnappyMail `application.ini` me koi imap/socket timeout directive nahi mila; JS me "Request timed out" sirf localization files me hai, actual JS timeout value locate nahi hua. Connection log me **120 s** duration dikhta hai → client-side ~120 s timeout pehle fire hua (Nginx 300 s se pehle). Exact JS constant confirm nahi kiya → NOT TESTED.',
    next: 'Browser network tab se exact timeout value confirm karna padega.',
  },
  {
    id: 6, title: 'Iframe sandbox + CSP + Content-Disposition', status: 'PASS',
    evidence: '`Webmail.jsx:456-466` iframe me **sandbox attribute nahi hai** — default behavior me downloads allowed hote hain (`allow-downloads` sirf tab block karne par chahiye). Response headers: `Content-Security-Policy` me **koi `sandbox` directive nahi**; `frame-ancestors self`, `X-Frame-Options SAMEORIGIN`, `default-src self data:`. CSP download ko block nahi karta. `Content-Disposition` header SnappyMail download action par set hota hai (code path Attachments.php). Browser-level actual download abhi aapka test baaki.',
    next: '—',
  },
  {
    id: 7, title: 'Kya bug Audit 10 migration se shuru hua?', status: 'NOT TESTED',
    evidence: 'Structural comparison me pre/post BODYSTRUCTURE **identical** hai (Q2), aur migration ne sirf bodies ko alag table/gz me le gaya — data content wahi hai. Lekin pre-migration **runtime** (purana daemon usi code ke saath) par 9 MiB `BODY.PEEK[1]` test nahi kiya gaya (scratch daemon setup config change maangta hai, jo is round me mana hai). Isliye "migration se hua / nahi hua" definitive nahi bol sakta — **NOT TESTED**. Evidence sirf itna hai ki structure aur bytes same hain.',
    next: 'Agle window me scratch daemon par pre-mig code se comparison.',
  },
]

export default function QaAudit15() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 15' }]} />
      <PageHeader title="Q&A AUDIT 15" subtitle="Browser bug diagnose-only · koi fix/config/DB/file change nahi · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
            <strong>Root cause mil gaya (Q3):</strong> <code>BODY.PEEK[1]</code> large mail par 60 s timeout. Ye "Request timed out" ka source hai. Attachment structure sahi hai; UI option ka reason abhi unconfirmed. Koi fix abhi nahi kiya.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status === 'PASS' ? 'success' : item.status === 'FAIL' ? 'danger' : 'warning'}>{item.status}</Badge>
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
