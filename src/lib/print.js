// Przeglądarka proponuje nazwę zapisywanego PDF-a na podstawie tytułu strony.
// Przed drukiem podmieniamy więc tytuł na nazwę z bieżącą datą — każdy wydruk
// dostaje świeżą nazwę pliku i nic nie nadpisuje starszych wersji.
export function printWithDatedFilename(baseName = "Harmonogram kropli") {
  const originalTitle = document.title;
  const dateStr = new Date().toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
  document.title = `${baseName} ${dateStr}`;

  const restore = () => {
    document.title = originalTitle;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
  // W Chrome print() blokuje do zamknięcia okna, w Safari wraca od razu,
  // a afterprint bywa pomijany — dlatego dodatkowa siatka bezpieczeństwa.
  setTimeout(restore, 1000);
}
