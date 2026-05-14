import { useState } from 'react'
import { supabase } from '../supabaseClient'
import styles from './LoginPage.module.css'

export default function LoginPage({ onCheckEmail }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      onCheckEmail()
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.icon}>✉️</div>
        <h1 className={styles.title}>Witaj!</h1>
        <p className={styles.subtitle}>
          Podaj swój adres e-mail, aby się zalogować.<br />
          Wyślemy Ci magiczny link — bez hasła.
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="twoj@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={styles.input}
            autoFocus
          />
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Wysyłanie...' : 'Wyślij link logowania'}
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  )
}
