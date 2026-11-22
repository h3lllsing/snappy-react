// Reverb/Echo integration stub. Uncomment connectEcho() when the BE is ready;
// the FE already renders live updates through LiveContext, so no page rewrite is needed.
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let echo = null

export function connectEcho(user, handlers = {}) {
  // echo = new Echo({
  //   broadcaster: 'reverb',
  //   key: import.meta.env.VITE_REVERB_APP_KEY,
  //   wsHost: import.meta.env.VITE_REVERB_HOST,
  //   wsPort: import.meta.env.VITE_REVERB_PORT,
  //   forceTLS: true,
  //   enabledTransports: ['ws', 'wss'],
  // })
  // ;['user', 'team', 'brand'].forEach(scope => {
  //   if (user[`${scope}_id`]) echo.private(`${scope}.${user[`${scope}_id`]}`).listen('.new-email', handlers.onNewEmail)
  // })
  return echo
}

export function disconnectEcho() {
  echo?.disconnect?.()
  echo = null
}

// FE reference stream: emits a realistic incoming-mail event every 20 seconds.
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
      id: Date.now(),
      mail_id: Date.now(),
      account: s.account,
      account_id: s.account_id,
      brand: s.brand,
      from: s.from,
      from_name: s.from_name,
      subject: s.subject,
      preview: 'This message arrived live. It appears on every dashboard and in SnappyMail without a refresh.',
      time: 'just now',
      unread: true,
      has_attachment: i % 2 === 0,
    })
  }, 20000)
  return () => clearInterval(id)
}
