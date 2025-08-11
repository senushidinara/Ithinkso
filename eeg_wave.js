// eeg_wave.js
let canvas, ctx, width, height, rafId
let lastBands = { delta:0.5, theta:0.5, alpha:1, beta:1, gamma:0.5 }

export function initEEGCanvas(selectorId='eegCanvas'){
  canvas = document.getElementById(selectorId)
  if(!canvas) return
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  loop()
}

function resize(){
  if(!canvas) return
  width = canvas.width = canvas.clientWidth * devicePixelRatio
  height = canvas.height = canvas.clientHeight * devicePixelRatio
  ctx.scale(devicePixelRatio, devicePixelRatio)
}

export function setBands(bands){
  // bands: {delta,theta,alpha,beta,gamma}
  lastBands = bands
}

function synthSample(x, t){
  // combine sine waves weighted by bands -> animate
  const b = lastBands
  // base frequencies (Hz)
  const fDelta = 1.5, fTheta=5, fAlpha=10, fBeta=20, fGamma=35
  return (b.delta*Math.sin(2*Math.PI*fDelta*(t + x*0.001)) +
          b.theta*Math.sin(2*Math.PI*fTheta*(t + x*0.001)) +
          b.alpha*Math.sin(2*Math.PI*fAlpha*(t + x*0.001)) +
          b.beta*Math.sin(2*Math.PI*fBeta*(t + x*0.001)) * 0.8 +
          b.gamma*Math.sin(2*Math.PI*fGamma*(t + x*0.001)) * 0.4)
}

function loop(){
  if(!ctx) return
  const now = performance.now() / 1000
  ctx.clearRect(0,0,canvas.clientWidth, canvas.clientHeight)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(124,58,237,0.9)'
  ctx.beginPath()
  const step = 4
  for(let x=0;x<canvas.clientWidth;x+=step){
    const y = canvas.clientHeight/2 + synthSample(x, now)*40
    if(x===0) ctx.moveTo(x,y)
    else ctx.lineTo(x,y)
  }
  ctx.stroke()

  // subtle glow
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = 'rgba(99,102,241,0.03)'
  ctx.fillRect(0,0,canvas.clientWidth, canvas.clientHeight)
  ctx.globalCompositeOperation = 'source-over'

  rafId = requestAnimationFrame(loop)
}

export function stopEEG(){
  cancelAnimationFrame(rafId)
}
