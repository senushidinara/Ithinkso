// src/storage.js
export const STORAGE_KEYS = {
  SESSIONS: 'neuro_sessions_v3',
  USERS: 'neuro_users_v1',
  ACTIVE_USER: 'neuro_active_user'
}

// --- Users & Profiles ---
export function loadUsers(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]') } catch(e){ return [] }
}
export function saveUser(profile){
  const users = loadUsers()
  const idx = users.findIndex(u=>u.id===profile.id)
  if(idx>=0) users[idx] = profile
  else users.unshift(profile)
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users.slice(0,50)))
}
export function getActiveUser(){
  const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER)
  if(!id) return null
  return loadUsers().find(u=>u.id===id) || null
}
export function setActiveUser(id){
  localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, id)
}
export function createDefaultUser(name='You'){
  const id = 'u_' + Math.random().toString(36).slice(2,9)
  const profile = {
    id, name, createdAt: Date.now(), level: 1, xp: 0, xpToNext: 100, streak:0, prefs:{sound:true, theme:'calm'}
  }
  saveUser(profile); setActiveUser(id); return profile
}

// --- Sessions ---
export function loadSessions(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]') }catch(e){ return [] }
}
export function saveSession(session){
  const arr = loadSessions()
  arr.unshift(session)
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(arr.slice(0,1000)))
  return session
}
export function clearAll(){
  localStorage.removeItem(STORAGE_KEYS.SESSIONS)
  localStorage.removeItem(STORAGE_KEYS.USERS)
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER)
}
