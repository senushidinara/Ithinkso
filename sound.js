// sound.js
const AudioCtx = window.AudioContext || window.webkitAudioContext
export const audioCtx = new AudioCtx()

export function playClick(volume=0.04, freq=880){
  const o = audioCtx.createOscillator(), g = audioCtx.createGain()
  o.type = 'sine'; o.frequency.value = freq
  g.gain.value = volume
  o.connect(g); g.connect(audioCtx.destination)
  o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.09)
  o.stop(audioCtx.currentTime + 0.1)
}

export function playChime(){
  const now = audioCtx.currentTime
  const freqs = [880, 1320, 1760]
  freqs.forEach((f,i)=>{
    const o = audioCtx.createOscillator(), g = audioCtx.createGain()
    o.type = 'sine'; o.frequency.value = f
    g.gain.value = 0.02
    o.connect(g); g.connect(audioCtx.destination)
    o.start(now + i*0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, now + i*0.05 + 0.35)
    o.stop(now + i*0.05 + 0.36)
  })
}
