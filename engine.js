// src/engine.js
import { saveSession, loadSessions, loadUsers, saveUser, getActiveUser, setActiveUser } from './storage.js'
import { setBands } from './eeg_wave.js'
import { playChime, playClick } from './sound.js'

// Progression helpers
export function xpForLevel(level, base=100, growth=1.4){
  // XP needed to reach *this* level (cumulative)
  let xp = 0
  for(let L=1; L<level; L++){
    xp += Math.round(base * Math.pow(growth, L-1))
  }
  return xp
}
export function xpToLevel(level, base=100, growth=1.4){
  return Math.round(base * Math.pow(growth, level-1))
}

// compute session metrics
export function computeSessionMetrics(session){
  const trials = session.trials || []
  const rts = trials.filter(t=>t.rt!=null).map(t=>t.rt)
  const avgRT = rts.length ? rts.reduce((a,b)=>a+b,0)/rts.length : null
  const acc = trials.length ? trials.filter(t=>t.correct).length / trials.length : null
  const rtStd = rts.length ? Math.sqrt(rts.map(x=>Math.pow(x-avgRT,2)).reduce((a,b)=>a+b,0)/rts.length) : 0
  return { avgRT, acc, rtStd, trialsCount: trials.length }
}

// difficulty scaling: moving average composite and level decision
export function computeCompositeFromHistory(history, params){
  // history: most recent sessions (newest first)
  const window = params?.baselineWindow || 7
  const weights = params?.compositeWeights || {accuracy:0.6, speed:0.3, consistency:0.1}
  const slice = history.slice(0, window)
  if(slice.length === 0) return { composite: 0, members:0 }
  const metrics = slice.map(s => computeSessionMetrics(s))
  const avgAcc = metrics.reduce((a,b)=>a+(b.acc||0),0)/metrics.length
  const avgRT = metrics.reduce((a,b)=>a+(b.avgRT||0),0)/metrics.length
  const latest = metrics[0]
  const accScore = (latest.acc - avgAcc) // positive means improved accuracy
  const rtScore = (avgRT - (latest.avgRT||avgRT)) / Math.max(1, avgRT) // positive faster
  const consistency = 1 - Math.min(1, (latest.rtStd || 0) / 500)
  const composite = weights.accuracy*accScore + weights.speed*rtScore + weights.consistency*consistency
  return { composite, accScore, rtScore, consistency, members: slice.length }
}

export function suggestDifficulty(history, params){
  const r = computeCompositeFromHistory(history, params)
  // transform composite into level multiplier
  const base = 1
  const mult = Math.max(0.5, Math.min(3, 1 + r.composite * 6))
  return { multiplier: mult, composite: r.composite }
}

// Level & XP awarding
export function awardXPToActiveUser(xp){
  // find active user and award xp; if no active user create default
  const users = loadUsers()
  let user = (function(){
    const rawActive = localStorage.getItem('neuro_active_user')
    if(rawActive) return users.find(u=>u.id===rawActive)
    return null
  })()
  if(!user){
    // create default
    user = createDefaultUser('You')
  }
  user.xp = (user.xp||0) + xp
  // level up while xp >= xpToLevel
  let leveled = false
  while(user.xp >= (user.xpToNext || xpToLevel(user.level || 1))){
    user.xp -= (user.xpToNext || xpToLevel(user.level || 1))
    user.level = (user.level || 1) + 1
    user.xpToNext = xpToLevel(user.level || 1)
    leveled = true
  }
  saveUser(user)
  return { user, leveled }
}

// deterministic behavior -> bands mapping (same logic but centralized)
export function simulateBands(session, opts={}){
  const p = Object.assign({ baseRT:500, scale:5, rFactor:1.6 }, opts)
  const m = computeSessionMetrics(session)
  const meanRT = m.avgRT || 900
  const accuracy = m.acc || 0.75
  const rtStd = m.rtStd || 0.0
  const baseRT = p.baseRT
  const speedFactor = Math.max(0.01, (baseRT - meanRT) / baseRT)
  const fatigueFactor = Math.max(0, (meanRT - baseRT) / baseRT)
  const varFactor = Math.min(1, rtStd / 300)
  const beta = Math.max(0, speedFactor * (0.5 + 0.8*accuracy) - 0.3*varFactor)
  const gamma = Math.max(0, speedFactor * (0.2 + 0.6*accuracy) - 0.2*varFactor)
  const alpha = Math.max(0, 0.5*(1 - speedFactor) * (0.6 + 0.4*accuracy))
  const theta = Math.max(0, fatigueFactor * (0.4 + 0.6*varFactor))
  const delta = Math.max(0, fatigueFactor * (0.2 + 0.4*varFactor))
  // nonlinear scaling
  const rf = p.rFactor
  const bs = {
    delta: Math.pow(delta + 1e-6, rf),
    theta: Math.pow(theta + 1e-6, rf),
    alpha: Math.pow(alpha + 1e-6, rf),
    beta: Math.pow(beta + 1e-6, rf),
    gamma: Math.pow(gamma + 1e-6, rf)
  }
  const norm = bs.delta + bs.theta + bs.alpha + bs.beta + bs.gamma
  const scale = (p.scale) / Math.max(4.0, norm)
  const bands = Object.fromEntries(Object.entries(bs).map(([k,v])=>[k, +(v*scale).toFixed(4)]))
  // push to eeg display
  setBands(bands)
  return { metrics: m, bands }
}
