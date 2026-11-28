import { Badge, Card, CardBody, PageHeader } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'

/** Fix + verification register — 2026-11-28. No secret values stored here. */
const ITEMS = [
  {
    id: 1, title: 'Step 1 — connlog mein command-level metadata', status: 'PASS',
    evidence: '`ImapProtocol.php` CONN_LOG_FIELDS me `commands` array: har record `{cmd, uid, section, resp_bytes, elapsed_ms}`; cmd allowlist (CAPABILITY/LOGIN/…/UID FETCH), section strict regex, 50-command cap, LOGIN args kabhi copy nahi. `imap:connlog --commands` se aggregated counts. LIVE sample: `UID FETCH uid=1172 section=1 resp_bytes=13073229 elapsed_ms=152`, `UID FETCH uid=1171 section=null resp_bytes=9805844 elapsed_ms=174`. Koi email/subject/body nahi. Tests 201/201.',
    next: 'Ab aap browser me mail khol sakte hain — alag command sequence isi log se nikalenge.',
  },
  {
    id: 2, title: 'Step 2 — partial-section chunked stream + part index', status: 'PASS',
    evidence: '`streamBodyLiteral()` ab range (`start`/`length`) stream karti hai: 64 KiB `gzread`, `fwrite` return-check loop, `fflush`; numeric parts (`1`, `2.MIME`, dotted) aur `BODY[]<offset.len>` migrated rows ke liye `literal_stream` descriptor. Part offsets ek baar disk-backed `tmpfile()` se banakar cache (`partIndexCache`, 32 entries) — poori raw property me nahi. LIVE: 9 MiB `BODY.PEEK[1]` **60 s timeout → 184 ms / 9,804,868 B**; 12 MiB **196 ms / 13,073,158 B**; `1.MIME` 161 ms; `<0.65536>` 108 ms; legacy raw fallback intact. Peak: daemon RSS 77 MB (4 workers), client 28 MB. Tests 201/201.',
    next: '—',
  },
  {
    id: 3, title: 'Step 3 — stalled client deadline + baqi connections', status: 'PASS',
    evidence: '`IMAP_LITERAL_WRITE_DEADLINE_SECONDS` (default 18, clamp 5–60) + non-blocking socket + `stream_select` write readiness; deadline par byte-only `ops_events` event + clean close. SLOW TEST (12 MB, 10 KB/s): server ne **18,171 ms** par connection close kiya, `close_reason=timeout`, `bytes_out=2,589,098`; usi time doosre user (804) ke 11 login+fetch attempts **92.5–100.5 ms** (koi block nahi). 1032/1032 integrity dobara PASS (0 failures). Audit 14 item 3 (connection log) ab commands ke saath expanded.',
    next: '—',
  },
  {
    id: 4, title: 'Step 4 — real 8 MiB binary attachment (804→803 relay)', status: 'PASS',
    evidence: 'Application ke normal relay path se 8 MiB random binary bheja (auth 235, koi credential print nahi). Mirror: email id **9303**, acct 803, INBOX uid 1181; `email_attachments` id 1108, **8192 KB**, `path=""` (lazy >5 MB), sha256 **match**. BODYSTRUCTURE 47.9 ms me `("application" "octet-stream" … "base64" 8388608 ("attachment" ("filename" MASKED)))`. `BODY.PEEK[2]` 219.7 ms / 11,479,150 encoded B → base64-decode 8,388,608 B → sha256 original se **match**. `docs/TEST-MAILS.md` ab 45 rows (9303 + Sent copy 9302 add). Koi test mail delete nahi.',
    next: 'Aap browser check karke delete ijazat dein to scoped cleanup.',
  },
  {
    id: 5, title: 'Step 5 — CLI command-sequence replay (5 targets)', status: 'PASS (browser NOT TESTED)',
    evidence: 'Log pattern (CAPABILITY → LOGIN → EXAMINE → UID FETCH BODYSTRUCTURE/HEADER.FIELDS/parts → LOGOUT) replay: small plain **345 ms**, Invoice PDF (uid 14) **448 ms**, 9 MiB **622 ms**, 12 MiB **743 ms**, 8 MiB attachment **787 ms**. Sab commands ke saath elapsed_ms/bytes upar log me. Browser me SnappyMail ki asli sequence abhi capture nahi hui — aapke browser check ke baad log se nikalenge.',
    next: 'Aap browser me 9/12 MiB kholkar attachment download karein; main log se asli sequence nikalunga.',
  },
  {
    id: 6, title: 'Audit 14 items 1–6 (baaki) — re-verify', status: 'PASS',
    evidence: '(1) `.env:76 IMAP_WORKERS=4`, unit EnvironmentFile, `imap_busy=0 established=0 workers=4`. (2) 4 aur 6 held connections ke saath 7wi login 91.9/96.0 ms, fetch 48.2/47.7 ms — multiplex model. (3) connection log ab metadata + commands; `close_reason client_eof=26 timeout=25 logout=140`. (4) `config:show sync.max_mb → 48` unchanged; LVM ke baad derived 27.2/21.8 MB sirf hisaab. (5) cleanup plan + 45-row TEST-MAILS.md, koi delete nahi. (6) NETWORK-LVM-REBOOT-PLAN.md addenda unchanged, koi command execute nahi.',
    next: 'Gate 1 window tak sab pending wahi rahega.',
  },
]

export default function QaAudit16() {
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: 'Q&A Audit 16' }]} />
      <PageHeader title="Q&A AUDIT 16" subtitle="P0 fix: partial stream · stalled-client deadline · real attachment · CLI replay · koi secret nahi" />
      <Card>
        <CardBody>
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <strong>6 PASS.</strong> P0 (b) "Request timed out" fix ho gaya: <code>BODY.PEEK[1]</code> 60 s → 184 ms. Browser-level final test aapka baaki. Rollback ke liye 3 timestamped <code>.bak</code> copies maujood hain.
          </div>
          <div className="space-y-3">
            {ITEMS.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={item.status.startsWith('PASS') ? 'success' : 'warning'}>{item.status}</Badge>
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
