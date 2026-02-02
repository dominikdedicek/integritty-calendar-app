# Room Display Calendar

Webová aplikace pro zobrazení stavu zasedací místnosti s integrací Google Calendar. Určeno pro tablety/displeje umístěné u dveří místnosti.

## Funkce

- **Zobrazení stavu místnosti**: VOLNO / OBSAZENO s odpočtem času
- **Seznam dnešních událostí**: přehled schůzek s časem, názvem a organizátorem
- **Rychlá rezervace**: vytvoření rezervace na 15/30/45/60 minut jedním kliknutím
- **Automatická aktualizace**: polling každých 30 sekund (konfigurovatelné)
- **Offline podpora**: zobrazení posledních dat při výpadku připojení
- **Responzivní design**: optimalizováno pro tablety i desktop

## Architektura

```
room-display-calendar/
├── frontend/          # React + TypeScript + MUI
│   ├── src/
│   │   ├── components/    # UI komponenty (StatusHeader, EventList, ReserveDialog)
│   │   ├── hooks/         # Custom hooks (useCalendarData, useClock)
│   │   ├── services/      # API client
│   │   ├── utils/         # Utility funkce (slot calculation, time formatting)
│   │   └── types/         # TypeScript typy
│   └── ...
├── backend/           # Node.js + Express
│   ├── src/
│   │   ├── routes/        # API endpointy
│   │   ├── services/      # Google Calendar integrace
│   │   └── types/         # TypeScript typy
│   └── ...
└── package.json       # Root workspace configuration
```

## Požadavky

- Node.js >= 18
- npm >= 8
- Google Cloud projekt s povoleným Calendar API
- Service Account s přístupem ke kalendáři místnosti

## Nastavení Google Calendar

### 1. Vytvoření projektu v Google Cloud Console

1. Přejděte na [Google Cloud Console](https://console.cloud.google.com/)
2. Vytvořte nový projekt nebo vyberte existující
3. Povolte **Google Calendar API**:
   - APIs & Services → Library → vyhledejte "Google Calendar API" → Enable

### 2. Vytvoření Service Account

1. APIs & Services → Credentials → Create Credentials → Service Account
2. Zadejte název (např. "room-display")
3. Po vytvoření klikněte na service account → Keys → Add Key → Create new key → JSON
4. Stáhne se soubor s credentials - **UCHOVEJTE V BEZPEČÍ!**

### 3. Sdílení kalendáře se Service Account

1. Otevřete [Google Calendar](https://calendar.google.com/)
2. Najděte kalendář místnosti v levém panelu
3. Klikněte na tři tečky → Settings and sharing
4. V sekci "Share with specific people" přidejte email service accountu
   - Email má formát: `nazev@projekt-id.iam.gserviceaccount.com`
   - Nastavte oprávnění: **Make changes to events** (pro vytváření rezervací)
5. **Calendar ID** najdete v Settings → Integrate calendar → Calendar ID
   - Formát: `xxxxx@group.calendar.google.com` nebo primární email

## Instalace a spuštění

### 1. Klonování a instalace závislostí

```bash
git clone <repository-url>
cd room-display-calendar
npm install
```

### 2. Konfigurace backendu

```bash
cp backend/.env.example backend/.env
```

Upravte `backend/.env`:

```env
# ID kalendáře (viz výše)
CALENDAR_ID=your-calendar-id@group.calendar.google.com

# Časová zóna
TIMEZONE=Europe/Prague

# Název místnosti zobrazený v UI
ROOM_NAME=Zasedací místnost

# Interval obnovování dat (sekundy)
REFRESH_INTERVAL_SECONDS=30

# Credentials - zvolte JEDNU variantu:

# Varianta 1: JSON string (doporučeno pro produkci)
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"..."}'

# Varianta 2: Cesta k souboru (pro lokální vývoj)
# GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json

# Server konfigurace
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### 3. Spuštění lokálně

```bash
# Spustí backend i frontend současně
npm run dev
```

Aplikace běží na:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Nasazení (Deployment)

### Vercel (doporučeno)

1. **Backend jako API Routes v Next.js**:
   - Převeďte backend na Next.js API routes
   - Nebo nasaďte backend samostatně (viz níže)

2. **Frontend**:
   ```bash
   cd frontend
   npm run build
   vercel deploy
   ```

3. Nastavte environment variables v Vercel Dashboard

### Render / Railway

1. Vytvořte dva services:
   - **Backend**: Node.js service
   - **Frontend**: Static Site

2. Backend:
   ```bash
   # Start command
   npm run start -w backend
   ```

3. Frontend:
   ```bash
   # Build command
   npm run build -w frontend
   # Publish directory
   frontend/dist
   ```

### Docker

```dockerfile
# Dockerfile pro backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY backend ./backend
RUN npm install --workspace=backend
RUN npm run build -w backend
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "backend"]
```

```dockerfile
# Dockerfile pro frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY frontend ./frontend
RUN npm install --workspace=frontend
RUN npm run build -w frontend

FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
```

## API Endpointy

### GET /api/events

Vrací dnešní události a stav místnosti.

**Response:**
```json
{
  "events": [
    {
      "id": "event-id",
      "title": "Standup",
      "start": "2024-01-15T09:00:00+01:00",
      "end": "2024-01-15T09:30:00+01:00",
      "organizer": "jan@example.com",
      "isAllDay": false,
      "status": "confirmed"
    }
  ],
  "status": {
    "isOccupied": false,
    "currentEvent": null,
    "nextEvent": {...},
    "timeUntilNextEvent": 3600000,
    "timeUntilCurrentEventEnd": null
  },
  "timestamp": "2024-01-15T08:00:00Z"
}
```

### GET /api/events/config

Vrací konfiguraci místnosti.

**Response:**
```json
{
  "roomName": "Zasedací místnost",
  "timezone": "Europe/Prague",
  "refreshIntervalSeconds": 30
}
```

### POST /api/events/reserve

Vytvoří rychlou rezervaci.

**Request:**
```json
{
  "start": "2024-01-15T10:00:00+01:00",
  "end": "2024-01-15T10:30:00+01:00",
  "title": "Rychlá rezervace"  // volitelné
}
```

**Response (success):**
```json
{
  "success": true,
  "event": {...}
}
```

**Response (conflict - 409):**
```json
{
  "success": false,
  "error": "Mezitím někdo zabral slot, zkus to znovu.",
  "conflictingEvent": {...}
}
```

## Pravidla pro rezervace

- **Zaokrouhlení času**: Start rezervace je zaokrouhlen nahoru na nejbližších 5 minut
  - Důvod: praktičtější pro reálné schůzky, čistší časy v kalendáři
- **Standardní sloty**: 15, 30, 45, 60 minut
- **Custom slot**: pokud zbývá např. 43 minut, nabídne se i tento nestandardní slot
- **Minimální slot**: 5 minut (kratší sloty se nenabízí)
- **All-day eventy**: považovány za obsazeno celý den
- **Kolize**: server před vytvořením ověří, že slot není zabraný

## Testování

```bash
# Spustit všechny testy
npm test

# Spustit testy s watch mode (frontend)
npm run test:watch -w frontend
```

## Alternativa B: OAuth autentizace

Pro scénáře, kdy chcete používat OAuth (každý uživatel se přihlásí svým účtem):

1. V Google Cloud Console vytvořte OAuth 2.0 Client ID
2. Implementujte OAuth flow ve frontendu
3. Upravte backend pro příjem access tokenů od klientů

Tato varianta je vhodná pro:
- Personalizované displeje (zobrazení vlastního kalendáře)
- Situace, kdy nelze sdílet kalendář se service accountem

## Popis UI

### Header (StatusHeader)
- Název místnosti
- Velký badge VOLNO (zelený) / OBSAZENO (červený)
- Odpočet do konce aktuální události nebo začátku další
- Aktuální datum a čas (živě aktualizováno)

### Hlavní část (EventList)
- Seznam dnešních událostí
- Každá událost: čas od-do, název, organizátor
- Aktuálně probíhající událost je zvýrazněna
- Prázdný stav: "Dnes bez událostí"

### Footer (ReserveButton)
- Velké tlačítko REZERVOVAT
- Pokud je místnost obsazená nebo zbývá < 5 minut: tlačítko disabled s vysvětlením

### Rezervační dialog (ReserveDialog)
- Výběr délky rezervace (toggleable buttony)
- Preview času rezervace
- Potvrzení / zrušení
- Error handling (kolize, síťové chyby)

## Licence

MIT
