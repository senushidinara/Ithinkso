// charts.js
import { simulateBands } from './engine.js'

let perfChart, bandsChart

export function initCharts(){
  const perfCtx = document.getElementById('performanceChart').getContext('2d')
  perfChart = new Chart(perfCtx, {
    type: 'line',
    data: { labels: [], datasets:[
      { label:'Accuracy %', data:[], borderColor:'#22c55e', tension:0.3 },
      { label:'Avg RT (ms)', data:[], borderColor:'#f97316', tension:0.3, yAxisID:'rt' }
    ]},
    options:{scales:{y:{position:'left'}, rt:{position:'right', grid:{display:false}}}}
  })

  const bandsCtx = document.getElementById('bandsChart').getContext('2d')
  bandsChart = new Chart(bandsCtx, {
    type:'line',
    data: { labels:[], datasets:[
      { label:'Delta', data:[], borderColor:'#7c3aed', tension:0.3 },
      { label:'Theta', data:[], borderColor:'#0ea5e9', tension:0.3 },
      { label:'Alpha', data:[], borderColor:'#22c55e', tension:0.3 },
      { label:'Beta',  data:[], borderColor:'#f97316', tension:0.3 },
      { label:'Gamma', data:[], borderColor:'#ef4444', tension:0.3 },
    ]},
    options:{plugins:{legend:{display:true}}}
  })
}

export function pushSessionToCharts(session){
  // compute session-level metrics
  const trials = session.trials || []
  const rts = trials.filter(t=>t.rt!=null).map(t=>t.rt)
  const avgRT = rts.length ? Math.round(rts.reduce((a,b)=>a+b,0)/rts.length) : null
  const acc = trials.length ? Math.round(trials.filter(t=>t.correct).length / trials.length * 100) : null
  const label = new Date(session.created_at).toLocaleTimeString()

  // update perf chart
  perfChart.data.labels.push(label)
  perfChart.data.datasets[0].data.push(acc)
  perfChart.data.datasets[1].data.push(avgRT)
  if(perfChart.data.labels.length>30){
    perfChart.data.labels.shift(); perfChart.data.datasets.forEach(d=>d.data.shift())
  }
  perfChart.update()

  // band timeline: simulate bands for the session (engine)
  const bandsSeries = simulateBands(session)
  bandsChart.data.labels.push(label)
  const keys = ['delta','theta','alpha','beta','gamma']
  keys.forEach((k, idx) => bandsChart.data.datasets[idx].data.push(bandsSeries[k]))
  if(bandsChart.data.labels.length>30){
    bandsChart.data.labels.shift(); bandsChart.data.datasets.forEach(d=>d.data.shift())
  }
  bandsChart.update()
}
