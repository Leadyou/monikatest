import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import styles from './QuotePage.module.css'

const QUOTES = [
  { text: "Sukces to suma małych wysiłków powtarzanych dzień po dniu.", author: "Robert Collier" },
  { text: "Nie czekaj. Nigdy nie będzie właściwego momentu.", author: "Napoleon Hill" },
  { text: "Jedynym sposobem na wykonanie dobrej pracy jest kochanie tego, co się robi.", author: "Steve Jobs" },
  { text: "Życie jest tym, co się dzieje, gdy jesteś zajęty robieniem innych planów.", author: "John Lennon" },
  { text: "Przyszłość należy do tych, którzy wierzą w piękno swoich marzeń.", author: "Eleanor Roosevelt" },
  { text: "Nie ważne, jak wolno idziesz, o ile się nie zatrzymujesz.", author: "Konfucjusz" },
  { text: "Wszystko wydaje się niemożliwe, dopóki nie zostanie zrobione.", author: "Nelson Mandela" },
  { text: "Bądź zmianą, którą pragniesz ujrzeć w świecie.", author: "Mahatma Gandhi" },
  { text: "Największa chwała w życiu nie leży w tym, żeby nigdy nie upaść, ale w tym, by wstawać za każdym razem.", author: "Nelson Mandela" },
  { text: "Droga tysiąca mil zaczyna się od jednego kroku.", author: "Laozi" },
  { text: "W środku trudności kryje się szansa.", author: "Albert Einstein" },
  { text: "Możesz to zrobić wolno albo szybko, ale ważne żebyś to zrobił.", author: "Theodore Roosevelt" },
  { text: "Jeśli możesz o czymś marzyć, możesz to osiągnąć.", author: "Walt Disney" },
  { text: "Odwaga to nie brak strachu, lecz ocena, że coś innego jest ważniejsze niż strach.", author: "Ambrose Redmoon" },
  { text: "Im ciężej pracujesz, tym więcej szczęścia masz.", author: "Thomas Jefferson" },
  { text: "Nie musisz być wspaniały, żeby zacząć, ale musisz zacząć, żeby być wspaniały.", author: "Zig Ziglar" },
  { text: "Sukces zazwyczaj przychodzi do tych, którzy są zbyt zajęci, aby go szukać.", author: "Henry David Thoreau" },
  { text: "Twoja jedyna granica to Ty sam.", author: "Anonimowy" },
  { text: "Marzenia bez działania pozostają marzeniami.", author: "Anonimowy" },
  { text: "Każdy ekspert był kiedyś początkującym.", author: "Helen Hayes" },
  { text: "Nie odkładaj na jutro tego, co możesz zrobić dziś.", author: "Benjamin Franklin" },
  { text: "Porażka to tylko okazja do ponownego rozpoczęcia, tym razem mądrzej.", author: "Henry Ford" },
  { text: "Wiara to śmiałość, a odwaga jest nagrodą.", author: "Anonimowy" },
  { text: "Najlepszym sposobem na przewidzenie przyszłości jest jej stworzenie.", author: "Peter Drucker" },
  { text: "Twój czas jest ograniczony, więc nie marnuj go na życie cudzym życiem.", author: "Steve Jobs" },
  { text: "Zrób coś dziś, za co jutrzejsze Ty będzie Ci wdzięczne.", author: "Anonimowy" },
  { text: "Ludzie sukcesu mają dużo siły woli, by robić to, czego ludzie bez sukcesu nie chcą robić.", author: "Thomas Edison" },
  { text: "Jedyną osobą, którą powinieneś starać się być lepszą, jest Ty z wczoraj.", author: "Anonimowy" },
  { text: "Zaczyna się od marzenia. Ale marzenia bez działania to tylko sny.", author: "Anonimowy" },
  { text: "Szczęście zależy od nas samych.", author: "Arystoteles" },
  { text: "Możliwości nie znikają. Ktoś inny je po prostu wykorzystuje.", author: "Anonimowy" },
  { text: "Rób to, czego się boisz, a strach umrze śmiercią pewną.", author: "Ralph Waldo Emerson" },
  { text: "Małe kroki każdego dnia prowadzą do wielkich osiągnięć.", author: "Anonimowy" },
  { text: "Nie chodzi o to, by mieć czas. Chodzi o to, by znaleźć czas.", author: "Anonimowy" },
  { text: "Życie to nie problem do rozwiązania, lecz rzeczywistość do doświadczenia.", author: "Søren Kierkegaard" },
  { text: "Energia i wytrwałość pokonują wszystko.", author: "Benjamin Franklin" },
  { text: "Im więcej się uczysz, tym więcej zarabiasz.", author: "Warren Buffett" },
  { text: "Zrób co możesz, z tym co masz, tam gdzie jesteś.", author: "Theodore Roosevelt" },
  { text: "Działaj tak, jakby było niemożliwe ponieść porażkę.", author: "Winston Churchill" },
  { text: "Jedynym sposobem na robienie świetnej pracy jest miłość do tego, co robisz.", author: "Steve Jobs" },
]

export default function QuotePage({ session, onLogout }) {
  const [quote, setQuote] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const random = QUOTES[Math.floor(Math.random() * QUOTES.length)]
    setQuote(random)
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    onLogout()
  }

  function handleNewQuote() {
    setVisible(false)
    setTimeout(() => {
      let next
      do {
        next = QUOTES[Math.floor(Math.random() * QUOTES.length)]
      } while (next === quote)
      setQuote(next)
      setVisible(true)
    }, 300)
  }

  const email = session?.user?.email ?? ''

  return (
    <div className={styles.wrapper}>
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.container}>
        <p className={styles.greeting}>Cześć, <strong>{email}</strong> 👋</p>

        <div className={`${styles.quoteCard} ${visible ? styles.visible : ''}`}>
          <div className={styles.quoteIcon}>"</div>
          {quote && (
            <>
              <p className={styles.quoteText}>{quote.text}</p>
              <p className={styles.quoteAuthor}>— {quote.author}</p>
            </>
          )}
        </div>

        <div className={styles.actions}>
          <button onClick={handleNewQuote} className={styles.newQuoteBtn}>
            ✨ Nowy cytat
          </button>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Wyloguj
          </button>
        </div>
      </div>
    </div>
  )
}
