import styles from './CheckEmailPage.module.css'

export default function CheckEmailPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.icon}>📬</div>
        <h1 className={styles.title}>Sprawdź skrzynkę!</h1>
        <p className={styles.text}>
          Wysłaliśmy Ci magiczny link logowania.<br />
          Kliknij go w e-mailu, aby się zalogować.
        </p>
        <p className={styles.hint}>
          Nie widzisz wiadomości? Sprawdź folder <strong>SPAM</strong>.
        </p>
      </div>
    </div>
  )
}
