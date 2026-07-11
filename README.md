# Krople po zaćmie

Aplikacja webowa (działa w przeglądarce na komputerze i telefonie) do rozpisywania i przypominania o podawaniu kropli do oka po operacji zaćmy. Na podstawie zaleceń lekarza (np. "4x dziennie przez 7 dni") sama generuje codzienny plan godzinowy — nie trzeba już ręcznie rozpisywać faz leczenia w arkuszu.

## Funkcje

- **Dziś** — lista dawek na dziś z kolejnością podania, informacją o pomijanych o danej porze lekach, odhaczaniem i przypomnieniami dźwiękowymi (gdy karta jest otwarta).
- **Leki** — dodawanie/edycja leków (nazwa, kolor nakrętki, kolejność podania) i etapów dawkowania (częstotliwość, start, koniec).
- **Przebieg** — automatycznie wykryte fazy leczenia i statystyki podanych dawek.

Dane są zapisane we wspólnej bazie danych (Supabase) — zmiana na jednym urządzeniu (np. odhaczenie dawki na telefonie) jest od razu widoczna na innym (np. na komputerze).

## Uruchomienie w trybie deweloperskim

```bash
npm install
npm run dev
```

## Wdrożenie

Strona buduje się i wdraża automatycznie na GitHub Pages przy każdym pushu (patrz `.github/workflows/deploy.yml`) — wystarczy w ustawieniach repozytorium (Settings → Pages) ustawić źródło na "GitHub Actions".

## Dane startowe

Przy pierwszym uruchomieniu ekran "Dziś" pozwala wczytać przykładowe dane odtworzone z prawdziwego wypisu szpitalnego (Oftaquix, Lotemax, Yellox, Hyal-Drop 4S) — można je potem dowolnie edytować lub usunąć w zakładce "Leki".
