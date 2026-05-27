# 🏢 FirmaCheck – ověření firmy podle IČO

FirmaCheck je webová aplikace pro ověřování českých firem podle IČO. Uživatel zadá IČO (případně i název firmy) a aplikace načte data z ARES, zobrazí detail firmy, umožní její uložení, porovnání názvu, zobrazení na mapě a export dat do CSV/JSON.

---

## 🚀 Live demo

👉 https://firmacheck-ashen.vercel.app  
👉 https://firmacheck-64odqgcog-jakubzamecniks-projects.vercel.app

---

## 🧰 Použitý stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- ARES REST API
- OpenStreetMap Nominatim (geocoding)
- LocalStorage (cache + ukládání dat)
- Vercel (deployment)

---

## 🔌 Použitá API

### 🏛 ARES API
Získávání firemních údajů podle IČO:

- IČO
- obchodní název
- právní forma
- datum vzniku
- stav subjektu
- DIČ
- adresa sídla

Endpoint:
```
https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}
```

Aplikace používá vlastní Next.js proxy endpoint:
```
/api/ares?ico=XXXXXXXX
```

---

### 🗺 Geocoding API (OpenStreetMap)
Použito pro převod adresy na souřadnice:

```
https://nominatim.openstreetmap.org/search
```

Výsledek se používá pro:
- zobrazení mapy odkazu
- doplnění GPS souřadnic

---

## 🧠 Funkcionality

### 1. Ověření firmy
- zadání IČO
- volitelný název firmy
- načtení dat z ARES
- validace vstupu (8 číslic)

---

### 2. Kontrola názvu firmy
Aplikace porovnává uživatelský název s ARES názvem:

- ✔ shoda
- ⚠ částečná shoda
- ❌ neshoda

Ignoruje:
- diakritiku
- mezery
- speciální znaky
- velikost písmen

---

### 3. Cache systém (SQLite-like simulace)
Aplikace simuluje cache vrstvu:

- první request → ARES API
- další request → LocalStorage cache
- klíč:
```
firmacheck_cache_{ICO}
```

Výhody:
- rychlejší načítání
- méně API requestů
- offline-like chování

---

### 4. Ukládání firem
Uložené firmy se ukládají do:

```
localStorage: firmacheck_saved_companies
```

Funkce:
- přidání firmy
- odstranění firmy
- kliknutí = znovu načíst detail
- persistence po refreshi

---

### 5. Mapa sídla firmy
- adresa se geokóduje přes Nominatim
- zobrazení:
  - Google Maps odkaz
  - Mapy.com odkaz
- iframe Mapy.com není podporován → nahrazen linkem

---

### 6. Export dat

#### 📊 CSV export
Obsahuje:
- IČO
- název firmy
- právní forma
- stav subjektu
- adresa
- datum vzniku
- datum ověření
- zdroj dat
- souřadnice

#### 📋 JSON export
- kopie dat do schránky
- vhodné pro API / další zpracování

---

## 🤖 Použité AI nástroje

- ChatGPT – návrh architektury aplikace
- ChatGPT – generování React komponent
- ChatGPT – tvorba API endpointu (ARES proxy)
- ChatGPT – debug a optimalizace kódu
- ChatGPT – návrh UX a struktury projektu

---

## 🧠 Ukázky promptů

### Prompt 1
```
Navrhni React aplikaci, která bude ověřovat firmy podle IČO pomocí ARES API a zobrazí detail firmy v UI.
```

---

### Prompt 2
```
Udělej Next.js API endpoint podle Swagger dokumentace ARES. Použij JSON strukturu ze Swaggeru a normalizuj data pro frontend formulář.
```

---

### Prompt 3
```
Navrhni UX pro formulář, který ověřuje firmu podle IČO a umožňuje ukládání do LocalStorage, export do CSV a zobrazení na mapě.
```

---

## 🔁 Vývojové iterace

### Iterace 1
- základní vyhledávání firmy
- napojení na ARES API
- jednoduché UI bez cache

### Iterace 2
- přidání cache (LocalStorage)
- ukládání firem
- export CSV/JSON
- validace názvu firmy
- geocoding a mapa

---

## 🚀 Co bych vylepšil

- přechod na reálnou SQLite / IndexedDB databázi
- uživatelský účet + login systém
- cloudová databáze (multi-user režim)
- full-text search firem
- historie vyhledávání
- lepší geocoding (přes Mapy.com API)
- testy (Jest / Playwright)
- rate limiting a backend ochrana API
```