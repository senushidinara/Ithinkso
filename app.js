// src/app.js
import { initEEGCanvas } from './eeg_wave.js'
import { initCharts, pushSessionToCharts } from './charts.js'
import { loadSessions, saveSession } from './storage.js'
import { simulateBands, awardXPToActiveUser, computeSessionMetrics } from './engine.js'
import { playChime } from './sound.js'

document.addEventListener('DOMContentLoaded', async ()=>{
  // load UI and content (content.json already integrated elsewhere)
  initCharts()
  initEEGCanvas()
  wireUI()
  refreshSessionsUI()
})

function wireUI(){
  document.getElementById('btnStart').addEventListener('click', async ()=>{
    await runReactionSession()
  })
  document.getElementById('btnExport').addEventListener('click', ()=>{
    const sessions = loadSessions()
    const blob = new Blob([JSON.stringify(sessions, null, 2)], {type:'application/json'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'neuro_sessions.json'; a.click()
  })
  document.getElementById('btnClear').addEventListener('click', ()=>{ if(confirm('Clear sessions and users?')){ localStorage.clear(); location.reload() } })
  document.querySelectorAll('.tab').forEach(t=> t.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'))
    t.classList.add('active')
    const tab = t.getAttribute('data-tab')
    document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'))
    document.getElementById('tab-'+tab).classList.remove('hidden')
  }))
}

async function runReactionSession(){
  const trials = []
  const trialCount = 12
  const stimEl = document.getElementById('stimulus')
  for(let i=0;i<trialCount;i++){
    const color = Math.random() < 0.5 ? '🔴' : '🔵'
    stimEl.textContent = color
    const t0 = performance.now()
    const clicked = await waitForClick(2000)
    const rt = clicked ? Math.round(performance.now() - t0) : null
    const correct = clicked ? true : false
    trials.push({ stim: color, choice: clicked? 'tap': 'miss', rt, correct, t_epoch: Date.now() })
    // small break
    await sleep(200 + Math.random()*200)
  }
  const session = { id: 's_' + Math.random().toString(36).slice(2,9), type: 'reaction', trials, created_at: Date.now() }
  saveSession(session)
  const { metrics, bands } = simulateBands(session)
  pushSessionToCharts(session)
  playChime()
  // award XP: simple rule: xp = correct_count * xpPerCorrect + fast responses bonus
  const correctCount = trials.filter(t=>t.correct).length
  const fastCount = trials.filter(t=> t.rt && t.rt < 350).length
  const xp = correctCount * 10 + fastCount * 5
  const res = awardXPToActiveUser(xp)
  if(res.leveled) alert('Congratulations! You leveled up to ' + res.user.level)
  refreshSessionsUI()
}

function waitForClick(timeout){
  return new Promise(resolve=>{
    let done=false
    function handler(){ if(done) return; done=true; window.removeEventListener('click', handler); resolve(true) }
    window.addEventListener('click', handler)
    setTimeout(()=>{ if(done) return; done=true; window.removeEventListener('click', handler); resolve(false) }, timeout)
  })
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }

function refreshSessionsUI(){
  const list = loadSessions()
  const el = document.getElementById('sessionList'); el.innerHTML = ''
  if(list.length === 0) el.innerText = 'No sessions yet'
  else {
    list.slice(0,8).forEach(s=>{
      const m = computeSessionMetrics(s)
      const d = document.createElement('div'); d.className='small muted'
      d.innerHTML = `<div><strong>${s.type}</strong> • ${new Date(s.created_at).toLocaleString()}</div><div>RT:${m.avgRT?Math.round(m.avgRT):'-'}ms Acc:${m.acc?Math.round(m.acc*100):'-'}%</div>`
      el.appendChild(d)
    })
    pushSessionToCharts(list[0])
  }
}
