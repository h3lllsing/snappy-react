let navigator = null

export function setNavigator(fn) {
  navigator = fn
}

export function navigateTo(path) {
  if (navigator) navigator(path)
  else window.location.assign(path)
}
