// Reverb/Echo integration. Live state stays in LiveContext, so only the event
// source changes when the backend is available.
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let echo = null

export function connectEcho(user, handlers = {}) {
  const key = import.meta.env.VITE_REVERB_APP_KEY
  if (!user || !key || import.meta.env.VITE_USE_API !== 'true') return null

  window.Pusher = Pusher
  echo = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 443),
    wsPath: '/app',
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
  })

  echo.private(`user.${user.id}`).listen('.new-email', handlers.onNewEmail)
  if (user.team_id) echo.private(`team.${user.team_id}`).listen('.new-email', handlers.onNewEmail)
  if (user.brand_id) echo.private(`brand.${user.brand_id}`).listen('.new-email', handlers.onNewEmail)

  return echo
}

export function disconnectEcho() {
  echo?.disconnect?.()
  echo = null
}

// Demo stream only used while the mock API is active.
export function startDemoStream(onEvent) {
  const senders = [
    { from: 'rebecca@penguinrandomhouse.com', from_name: 'Rebecca Wilson', brand: 'xuz.com', account: 'sales@xuz.com', account_id: 1, subject: 'Re: Final cover approval — The Bears' },
    { from: 'j.fernandez@barnesandnoble.com', from_name: 'Joshua Fernandez', brand: 'xyz.com', account: 'info@xyz.com', account_id: 4, subject: 'Publishing form — signed copy attached' },
    { from: 'sana@alphatach.com', from_name: 'Sana Iqbal', brand: 'alphatach.com', account: 'contact@alphatach.com', account_id: 6, subject: 'Weekly team sync notes' },
  ]
  let i = 0
  const id = setInterval(() => {
    const s = senders[i++ % senders.length]
    onEvent?.({
      id: Date.now(), mail_id: Date.now(),
      account: s.account, account_id: s.account_id, brand: s.brand,
      from: s.from, from_name: s.from_name, subject: s.subject,
      preview: 'This message arrived live. It appears on every dashboard and in SnappyMail without a refresh.',
      time: 'just now', unread: true, has_attachment: i % 2 === 0,
    })
  }, 20000)
  return () => clearInterval(id)
}
