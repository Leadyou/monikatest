# Krople po zaćmie

Aplikacja (Expo / React Native, Android) do rozpisywania i przypominania o podawaniu kropli do oka po operacji zaćmy. Na podstawie zaleceń lekarza (np. "4x dziennie przez 7 dni") sama generuje codzienny plan godzinowy — nie trzeba już ręcznie rozpisywać faz leczenia w arkuszu.

## Funkcje

- **Dziś** — lista dawek na dziś z kolejnością podania, informacją o pomijanych o danej porze lekach, odhaczaniem i lokalnymi przypomnieniami (jak budzik).
- **Leki** — dodawanie/edycja leków (nazwa, kolor nakrętki, kolejność podania) i etapów dawkowania (częstotliwość, start, koniec).
- **Przebieg** — automatycznie wykryte fazy leczenia i statystyki podanych dawek.

Dane trzymane są wyłącznie lokalnie na urządzeniu (bez konta, bez serwera).

## Uruchomienie w trybie deweloperskim

```bash
npm install
npx expo start
```

Zeskanuj kod QR aplikacją **Expo Go** na Androidzie (szybki podgląd; przypomnienia lokalne działają, ale najbardziej niezawodnie na zbudowanej aplikacji, patrz niżej).

## Zbudowanie instalowalnego .apk

Bez publikowania w Google Play, do zainstalowania bezpośrednio na telefonie:

```bash
npx eas login        # konto Expo (darmowe)
npx eas build:configure
npx eas build --platform android --profile preview
```

EAS zbuduje plik `.apk` w chmurze i poda link do pobrania — wystarczy otworzyć go na telefonie i zainstalować (włączając "instalację z nieznanych źródeł" dla przeglądarki/pliku).

## Dane startowe

Przy pierwszym uruchomieniu ekran "Dziś" pozwala wczytać przykładowe dane odtworzone z prawdziwego wypisu szpitalnego (Oftaquix, Lotemax, Yellox, Hyal-Drop 4S) — można je potem dowolnie edytować lub usunąć w zakładce "Leki".
