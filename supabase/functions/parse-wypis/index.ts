import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

// Klucz trzymany jako sekret funkcji (Supabase Dashboard -> Edge Functions -> Secrets),
// nigdy nie trafia do klienta.
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

// Kolejność pól odzwierciedla to, czego oczekuje ekran przeglądu w aplikacji
// (patient/medications/rules -> ten sam kształt co src/lib/seed.js).
const WYPIS_SCHEMA = {
  type: "object",
  properties: {
    patient: {
      type: "object",
      properties: {
        name: { anyOf: [{ type: "string" }, { type: "null" }], description: "Imię i nazwisko pacjenta, jeśli widoczne" },
        surgeryDate: { anyOf: [{ type: "string" }, { type: "null" }], description: "Data zabiegu w formacie YYYY-MM-DD" },
        eye: { anyOf: [{ type: "string", enum: ["lewe", "prawe", "oba"] }, { type: "null" }] },
      },
      required: ["name", "surgeryDate", "eye"],
      additionalProperties: false,
    },
    medications: {
      type: "array",
      description: "Każdy lek/kropla wymieniona w zaleceniach, jedna pozycja na lek.",
      items: {
        type: "object",
        properties: {
          key: { type: "string", description: "Krótki unikalny identyfikator, np. med1, med2" },
          name: { type: "string", description: "Nazwa leku dokładnie jak w dokumencie" },
          capColorGuess: {
            type: "string",
            description: "Zgadnij kolor nakrętki na podstawie typowych opakowań tego leku, jeśli nieznany użyj 'grey'",
            enum: ["tan", "pink", "grey", "blue"],
          },
        },
        required: ["key", "name", "capColorGuess"],
        additionalProperties: false,
      },
    },
    rules: {
      type: "array",
      description: "Reguła dawkowania dla każdej odrębnej fazy leczenia każdego leku.",
      items: {
        type: "object",
        properties: {
          medicationKey: { type: "string", description: "Musi odpowiadać polu 'key' z listy medications" },
          startDate: { type: "string", description: "Data rozpoczęcia tej reguły, YYYY-MM-DD" },
          frequencyPerDay: { type: "integer", enum: [1, 2, 3, 4] },
          endType: {
            type: "string",
            description: "'days' = liczba dni od startDate, 'date' = konkretna data końcowa, 'manual' = bez określonego końca (np. 'do odwołania')",
            enum: ["days", "date", "manual"],
          },
          endDays: { anyOf: [{ type: "integer" }, { type: "null" }], description: "Wymagane gdy endType='days'" },
          endDate: { anyOf: [{ type: "string" }, { type: "null" }], description: "Wymagane gdy endType='date', format YYYY-MM-DD" },
        },
        required: ["medicationKey", "startDate", "frequencyPerDay", "endType", "endDays", "endDate"],
        additionalProperties: false,
      },
    },
    notes: {
      type: "string",
      description: "Po polsku: niejasności, fragmenty nieczytelne, albo informacje wymagające ręcznej weryfikacji przez człowieka. Pusty string jeśli brak uwag.",
    },
  },
  required: ["patient", "medications", "rules", "notes"],
  additionalProperties: false,
};

const PROMPT = `Jesteś asystentem, który tłumaczy wypis ze szpitala po operacji zaćmy na strukturalny plan dawkowania kropli do oka.

Z załączonego dokumentu PDF wyodrębnij:
1. Dane pacjenta (imię i nazwisko, datę zabiegu, które oko) — jeśli czegoś brakuje, ustaw null.
2. Listę leków/kropli do podania.
3. Dla każdego leku jedną lub więcej reguł dawkowania odpowiadających kolejnym fazom leczenia opisanym w dokumencie (np. "4x dziennie przez pierwszy tydzień, potem 3x dziennie przez kolejny tydzień" to DWIE reguły z różnymi startDate).

Zasady:
- Jeśli lekarz napisał zalecenie w formie "malejącej" (np. 4x/dz -> 3x/dz -> 2x/dz -> 1x/dz co tydzień), rozpisz to na osobne reguły, każda z kolejną startDate.
- Gdy nie podano jawnie liczby dni ani daty końcowej danej fazy, a jest to ostatnia faza — użyj endType='manual'.
- Wszystkie daty licz względem daty zabiegu, jeśli podano ją explicite w dokumencie zamiast konkretnych dat kalendarzowych.
- Nie zgaduj informacji, których nie ma w dokumencie — zostaw null i opisz niepewność w polu "notes".
- To jest dokument medyczny — priorytetem jest wierność źródłu, nie uzupełnianie brakujących danych.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { pdfBase64 } = await req.json();
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Brak pliku PDF w żądaniu." }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: WYPIS_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return new Response(
        JSON.stringify({ error: "Model odmówił przetworzenia tego dokumentu." }),
        { status: 422, headers: JSON_HEADERS }
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Brak odpowiedzi tekstowej od modelu.");
    }

    const parsed = JSON.parse(textBlock.text);
    return new Response(JSON.stringify(parsed), { headers: JSON_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nieznany błąd.";
    console.error("parse-wypis error:", err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: JSON_HEADERS });
  }
});
