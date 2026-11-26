// One element per pooled voice; all media paths are served by the local game.
export function createInnerAudioContext() {
  const media = new Audio()
  media.preload = 'auto'
  return {
    get src() { return media.getAttribute('src') },
    set src(url) { media.src = url },
    get paused() { return media.paused },
    get duration() { return media.duration },
    get currentTime() { return media.currentTime },
    set loop(value) { media.loop = value },
    set volume(value) { media.volume = value },
    onPlay(callback) { media.addEventListener('play', callback) },
    onEnded(callback) { media.addEventListener('ended', callback) },
    onError(callback) { media.addEventListener('error', () => callback(media.error?.message)) },
    play() { media.play().catch(error => { if (!['AbortError','NotAllowedError'].includes(error.name)) console.warn(error.message) }) },
    pause() { media.pause() },
    seek(time) { media.currentTime = time },
    stop() { media.pause(); media.currentTime = 0 },
    destroy() { media.pause(); media.removeAttribute('src'); media.load() }
  }
}
