// Reverb/Echo integration. Live state stays in LiveContext; the server is the
// only event source. Echo and Pusher are loaded only when Reverb is configured.
let echo = null
let connectionGeneration = 0

export function connectEcho(user, handlers = {}) {
  const key = import.meta.env.VITE_REVERB_APP_KEY
  if (!user || !key) return null

  const generation = ++connectionGeneration
  Promise.all([
    import('laravel-echo'),
    import('pusher-js'),
  ]).then(([{ default: Echo }, { default: Pusher }]) => {
    if (generation !== connectionGeneration) return null

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
  }).catch((error) => {
    console.warn('Reverb connection could not start:', error)
    return null
  })

  // Returned synchronously so AuthContext can keep the WebSocket path and skip
  // polling while the connection is being established.
  return { disconnect: disconnectEcho }
}

export function disconnectEcho() {
  connectionGeneration += 1
  echo?.disconnect?.()
  echo = null
}

// Retained only as an inert subscription for legacy callers: no local events
// are produced, so all live updates come from the server.
export function startDemoStream() {
  return () => {}
}
