import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import LoginPage from './pages/LoginPage'
import CheckEmailPage from './pages/CheckEmailPage'
import QuotePage from './pages/QuotePage'

function getPage() {
  const hash = window.location.hash
  if (hash.includes('access_token') || hash.includes('type=magiclink') || hash.includes('type=recovery')) {
    return 'callback'
  }
  const path = window.location.pathname
  if (path === '/check-email') return 'check-email'
  return 'login'
}

export default function App() {
  const [page, setPage] = useState(getPage)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        window.history.replaceState({}, '', '/')
        setPage('quote')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!loading && session && page !== 'quote') {
      setPage('quote')
    }
  }, [loading, session])

  if (loading) {
    return (
      <div style={{ color: '#fff', fontSize: '18px', opacity: 0.6 }}>
        Ładowanie...
      </div>
    )
  }

  if (page === 'check-email') {
    return <CheckEmailPage />
  }

  if (page === 'quote' && session) {
    return <QuotePage session={session} onLogout={() => setPage('login')} />
  }

  return <LoginPage onCheckEmail={() => setPage('check-email')} />
}
