import { useColorScheme } from "react-native";

const light = {
  bg: "#EEF1EF",
  surface: "#FFFFFF",
  surfaceSoft: "#F4F6F4",
  border: "#D9DFDA",
  borderSoft: "#E6EBE7",
  ink: "#1B2422",
  inkSoft: "#5B6863",
  inkFaint: "#8B968F",
  accent: "#2B6E68",
  accentSoft: "#E2EEEC",
  accentInk: "#FFFFFF",
  amber: "#C97A3D",
  amberSoft: "#F7E9DE",
  green: "#4C7A5D",
  greenSoft: "#E3EDE6",
};

const dark = {
  bg: "#101614",
  surface: "#17211F",
  surfaceSoft: "#1D2825",
  border: "#2A3733",
  borderSoft: "#212C29",
  ink: "#E8ECE9",
  inkSoft: "#A3B3AC",
  inkFaint: "#718079",
  accent: "#59A89D",
  accentSoft: "#1D3532",
  accentInk: "#08130F",
  amber: "#E0965A",
  amberSoft: "#3A2C1F",
  green: "#7AB594",
  greenSoft: "#1D322A",
};

// Kolory nakrętek — dosłowne odwzorowanie identyfikacji z butelek leku,
// niezależne od jasnego/ciemnego motywu aplikacji.
export const CAP_COLORS = {
  tan: "#D8C39A",
  pink: "#E8AEBD",
  grey: "#E7E7E2",
  blue: "#A9C9DE",
};

export const CAP_COLOR_LABELS = {
  tan: "Beżowa",
  pink: "Różowa",
  grey: "Szara / biała",
  blue: "Błękitna",
};

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}

export const fontDisplay = "serif";
export const fontBody = undefined; // domyślna czcionka systemowa
