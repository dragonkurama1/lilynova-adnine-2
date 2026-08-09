'use client'

import { useState, useEffect, useCallback } from 'react'

const LS_KEY = 'admin_pw'

async function verifyPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Authentification admin partagée par toutes les pages /admin/**. Vérifie
 * toujours le mot de passe contre /api/admin/verify (côté serveur) — un
 * mot de passe sauvegardé en localStorage qui ne correspond plus à
 * ADMIN_PASSWORD est rejeté (corrige le bug où certaines pages admin
 * acceptaient un mot de passe en dur "admin2024" sans jamais vérifier).
 */
export function useAdminAuth() {
  const [isAuth, setIsAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
    if (!saved) { setChecking(false); return }
    verifyPassword(saved).then(ok => {
      if (ok) { setPassword(saved); setIsAuth(true) }
      else localStorage.removeItem(LS_KEY)
      setChecking(false)
    })
  }, [])

  const login = useCallback(async (pw: string): Promise<boolean> => {
    const ok = await verifyPassword(pw)
    if (ok) {
      localStorage.setItem(LS_KEY, pw)
      setPassword(pw)
      setIsAuth(true)
    }
    return ok
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    setPassword('')
    setIsAuth(false)
  }, [])

  return { isAuth, password, checking, login, logout }
}
