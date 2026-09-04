# TrollToGold Backend

> **"Turn trolls into engagement gold."**

An AI-powered REST API backend for content creators to analyze YouTube comments, detect toxicity and intent, generate strategic responses, and score their engagement potential.

**Featherless AI is the project's primary LLM inference provider.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [AI Pipeline](#3-ai-pipeline)
4. [Tech Stack](#4-tech-stack)
5. [Installation](#5-installation)
6. [Environment Variables](#6-environment-variables)
7. [Featherless AI Configuration](#7-featherless-ai-configuration)
8. [YouTube API Configuration](#8-youtube-api-configuration)
9. [Running the Backend](#9-running-the-backend)
10. [Demo Mode](#10-demo-mode)
11. [API Documentation](#11-api-documentation)
12. [Request & Response Examples](#12-request--response-examples)
13. [Error Handling](#13-error-handling)
14. [Testing](#14-testing)
15. [Security Notes](#15-security-notes)
16. [Frontend Integration](#16-frontend-integration)

---

## 1. Project Overview

TrollToGold helps content creators deal with toxic YouTube comments by:

- Fetching **real YouTube comments** from a video URL
- Running **toxicity analysis** (score 0–100, label, severity)
- Detecting **commenter intent** (trolling, criticism, hate, praise, etc.)
- Recommending a **response strategy** based on content
- Generating **3–5 creative replies** matching the chosen style
- Scoring each reply's **Gold Potential** (engagement/shareability)

The creator always remains in control — they select the final reply.

---

## 2. Architecture

```
Frontend (separate)
     |
     | REST API (JSON)
     ↓
Express Server (port 5000)
     |
     +-------------------------+
     |                         |
     ↓                         ↓
YouTube Service         Featherless Service
     |                         |
YouTube Data API v3     Featherless AI API
                              |
                    ┌─────────────────┐
                    │  Analysis Call  │
                    │  - Toxicity     │
                    │  - Intent       │
                    │  - Strategy     │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │  Reply Call     │
                    │  - 3-5 Replies  │
                    │  - Gold Scores  │
                    └────────┬────────┘
                             ↓
                    Gold Service (validation + safety caps)
                             ↓
                    Zod Schema Validation
                             ↓
                    Structured JSON Response
```

### Project Structure

```
troll-to-gold-backend/
├── src/
│   ├── app.ts                    # Express app factory
│   ├── server.ts                 # Server entry point
│   ├── config/env.ts             # Validated env config
│   ├── routes/                   # Express route definitions
│   ├── controllers/              # Request handlers
│   ├── services/
│   │   ├── featherless.service.ts  # ← ONLY Featherless caller
│   │   ├── analysis.service.ts     # AI analysis + reply pipeline
│   │   ├── youtube.service.ts      # YouTube Data API
│   │   ├── gold.service.ts         # Gold scoring + safety caps
│   │   ├── history.service.ts      # In-memory session history
│   │   └── demo.data.ts            # Demo mode mock data
│   ├── prompts/                  # LLM system + user prompts
│   ├── middleware/               # Validation + error handlers
│   ├── schemas/                  # Zod request schemas
│   ├── utils/                    # JSON parsing, sanitizer, logger
│   └── types/index.ts            # All shared TypeScript types
├── tests/                        # Jest test suite
├── .env.example
└── README.md
```

---

## 3. AI Pipeline

### Analysis Pipeline (one Featherless call)

```
Comment
  ↓
Featherless AI (analysis.prompt.ts)
  ↓
JSON: { toxicity, intent, strategy }
  ↓
Zod validation
  ↓
Sanitization
```

### Reply Generation Pipeline (one Featherless call)

```
Comment + Strategy
  ↓
Featherless AI (reply.prompt.ts)
  ↓
JSON: { replies: [...] }
  ↓
Gold Service (safety caps applied)
  ↓
Zod validation + sanitization
```

### Strategy Selection

| Intent            | Recommended Strategy    |
|-------------------|------------------------|
| playful_trolling  | comedian_comeback       |
| sarcasm / insult  | sarcastic_hr            |
| genuine_criticism | kind_redirect           |
| harassment / hate | ignore                  |
| high engagement   | clout_booster           |
| any               | shakespearean_roast     |

### Gold Potential Safety Caps

| Condition           | Max Gold Score |
|--------------------|---------------|
| severity = critical | 15            |
| intent = hate       | 10            |
| intent = harassment | 20            |
| strategy = ignore   | 5             |

---

## 4. Tech Stack

| Component     | Technology                    |
|---------------|-------------------------------|
| Runtime       | Node.js 18+                   |
| Framework     | Express.js 4.x                |
| Language      | TypeScript 5.x                |
| AI Provider   | **Featherless AI** (only)     |
| YouTube API   | YouTube Data API v3           |
| Validation    | Zod                           |
| HTTP client   | Axios                         |
| Logging       | Pino                          |
| Security      | Helmet, CORS, express-rate-limit |
| Testing       | Jest + Supertest              |

---

## 5. Installation

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- A Featherless AI API key (https://featherless.ai)
- A Google Cloud project with YouTube Data API v3 enabled

### Steps

```bash
# Clone / navigate to project
cd troll-to-gold-backend

# Install dependencies
npm install

# Copy the example env file
cp .env.example .env

# Edit .env with your credentials
# (see Environment Variables section)
```

---

## 6. Environment Variables

| Variable            | Required | Description                                    |
|---------------------|----------|------------------------------------------------|
| `FEATHERLESS_API_KEY` | Yes*   | Your Featherless AI API key                    |
| `FEATHERLESS_MODEL`   | Yes*   | Model ID to use (e.g. `meta-llama/Meta-Llama-3.1-8B-Instruct`) |
| `YOUTUBE_API_KEY`     | Yes*   | Google Cloud YouTube Data API v3 key           |
| `PORT`                | No     | Server port (default: 5000)                    |
| `NODE_ENV`            | No     | `development`, `production`, `test`            |
| `FRONTEND_URL`        | No     | Allowed CORS origin (default: http://localhost:3000) |
| `DEMO_MODE`           | No     | `true` = use mock data, no real API calls needed |

*\*Not required when `DEMO_MODE=true`*

---

## 7. Featherless AI Configuration

**Featherless AI is the ONLY LLM provider used in this project.**

1. Sign up at [https://featherless.ai](https://featherless.ai)
2. Create an API key in your dashboard
3. Choose a model that supports chat completions
4. Set in your `.env`:

```env
FEATHERLESS_API_KEY=your_key_here
FEATHERLESS_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
```

The model ID must be available on the Featherless platform.
Recommended models for this use case:
- `meta-llama/Meta-Llama-3.1-8B-Instruct`
- `meta-llama/Meta-Llama-3.1-70B-Instruct`
- `mistralai/Mistral-7B-Instruct-v0.3`

---

## 8. YouTube API Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable **YouTube Data API v3**
4. Create an **API Key** under Credentials
5. Set in your `.env`:

```env
YOUTUBE_API_KEY=your_key_here
```

---

## 9. Running the Backend

### Development (with hot reload)

```bash
npm run dev
```

Server starts at: `http://localhost:5000`

### Production build

```bash
npm run build
npm start
```

### TypeScript type check

```bash
npm run typecheck
```

---

## 10. Demo Mode

Set `DEMO_MODE=true` in your `.env` to run the backend without real API credentials.

In Demo Mode:
- **YouTube comments** are returned as realistic mock data
- **AI analysis** returns pre-built mock results
- **Reply generation** returns mock replies for all 6 strategies
- The **exact same API schema** is used — the frontend cannot tell the difference

This allows the frontend developer to integrate and build UI immediately.

```env
DEMO_MODE=true
```

> ⚠️ When `DEMO_MODE=false`, the backend uses **real Featherless AI and YouTube API** calls only. It will NOT silently fall back to mock data in live mode.

---

## 11. API Documentation

### Base URL

```
http://localhost:5000/api
```

### Endpoints Summary

| Method | Endpoint                  | Description                                 |
|--------|---------------------------|---------------------------------------------|
| GET    | `/api/health`             | Service health check                        |
| POST   | `/api/analyze`            | Analyze a comment (no replies)              |
| POST   | `/api/convert`            | Full pipeline: analyze + replies + gold     |
| POST   | `/api/generate-replies`   | Generate replies for a comment + strategy   |
| POST   | `/api/youtube/comments`   | Fetch real YouTube comments                 |
| GET    | `/api/history`            | Get session history (stretch goal)          |
| POST   | `/api/history`            | Save a history entry                        |

---

### GET /api/health

No request body.

**Response:**
```json
{
  "success": true,
  "service": "troll-to-gold-backend",
  "status": "healthy",
  "aiProvider": "featherless",
  "demoMode": false,
  "timestamp": "2024-10-15T10:00:00.000Z"
}
```

---

### POST /api/analyze

Analyze a comment for toxicity, intent, and recommended strategy. **Does not generate replies.**

**Request body:**
```json
{
  "comment": "Your content is garbage.",
  "videoTitle": "My Tutorial Video",
  "author": "TrollUser123",
  "context": "Programming tutorial"
}
```

Fields:
- `comment` *(required)* — The comment text (1–2000 chars)
- `videoTitle` *(optional)* — Video title for context
- `author` *(optional)* — Comment author username
- `context` *(optional)* — Additional context

**Response:**
```json
{
  "success": true,
  "data": {
    "toxicity": {
      "score": 65,
      "label": "toxic",
      "severity": "medium",
      "reason": "The comment uses dismissive language targeting the creator's content."
    },
    "intent": {
      "type": "insult",
      "confidence": 0.88,
      "reason": "Direct attack on content quality without constructive framing."
    },
    "strategy": {
      "recommended": "sarcastic_hr",
      "reason": "A sarcastic HR response deflects the insult while entertaining the audience."
    }
  }
}
```

---

### POST /api/convert

**Primary endpoint.** Full pipeline: analyze + generate 3–5 replies + gold scoring.

**Request body:**
```json
{
  "comment": "Your video is absolute garbage 😂",
  "strategy": "comedian_comeback"
}
```

Fields:
- `comment` *(required)* — The comment text (1–2000 chars)
- `strategy` *(optional)* — One of: `comedian_comeback`, `shakespearean_roast`, `sarcastic_hr`, `clout_booster`, `kind_redirect`, `ignore`

**Response:**
```json
{
  "success": true,
  "data": {
    "comment": "Your video is absolute garbage 😂",
    "toxicity": {
      "score": 74,
      "label": "toxic",
      "severity": "medium",
      "reason": "Uses dismissive language, but the emoji softens the intent slightly."
    },
    "intent": {
      "type": "playful_trolling",
      "confidence": 0.87,
      "reason": "Emoji usage and hyperbolic phrasing suggest performative trolling."
    },
    "strategy": {
      "recommended": "comedian_comeback",
      "used": "comedian_comeback",
      "reason": "Playful troll = great opportunity for a witty, high-engagement comeback."
    },
    "replies": [
      {
        "id": "reply_1",
        "text": "Thanks for the feedback! My garbage already has better ideas than your comment. 😂",
        "style": "comedian_comeback",
        "gold_potential": 91
      },
      {
        "id": "reply_2",
        "text": "Garbage? My analytics disagree — but thanks for watching! 📈",
        "style": "comedian_comeback",
        "gold_potential": 87
      },
      {
        "id": "reply_3",
        "text": "This comment is now the most entertaining thing on my channel. Thanks! 🙏",
        "style": "comedian_comeback",
        "gold_potential": 84
      }
    ]
  }
}
```

---

### POST /api/generate-replies

Generate replies only (requires an explicit strategy).

**Request body:**
```json
{
  "comment": "Your video is garbage 😂",
  "strategy": "comedian_comeback"
}
```

Both fields are **required**.

**Response:**
```json
{
  "success": true,
  "data": {
    "replies": [
      {
        "id": "reply_1",
        "text": "Thanks for the laugh! See you in the next video. 😄",
        "style": "comedian_comeback",
        "gold_potential": 88
      }
    ]
  }
}
```

---

### POST /api/youtube/comments

Fetch real YouTube comments for a video URL.

**Request body:**
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "maxResults": 50,
  "sort": "recent"
}
```

Fields:
- `videoUrl` *(required)* — A valid YouTube video URL
- `maxResults` *(optional)* — 1–100 (default: 50)
- `pageToken` *(optional)* — For pagination
- `sort` *(optional)* — `recent` | `likes` | `toxicity`

Supported URL formats:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://youtube.com/shorts/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

**Response:**
```json
{
  "success": true,
  "data": {
    "video": {
      "videoId": "dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up",
      "channelTitle": "Rick Astley"
    },
    "comments": [
      {
        "id": "UgxXXXXXXXX",
        "author": "TrollMaster9000",
        "text": "Bro really thought this was a good idea 💀",
        "likeCount": 142,
        "publishedAt": "2024-10-15T10:30:00Z"
      }
    ],
    "nextPageToken": "XXXXXXX",
    "totalResults": 1234
  }
}
```

---

### GET /api/history

Returns recent analysis history (newest first).

**Query params:**
- `limit` — max entries (default: 20, max: 100)
- `offset` — pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "uuid-here",
        "comment": "Your video is garbage",
        "strategy": "comedian_comeback",
        "toxicityScore": 74,
        "goldScore": 91,
        "selectedReply": "Thanks for the laugh!",
        "createdAt": "2024-10-15T10:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

---

## 12. Request & Response Examples

### curl Examples

**Health check:**
```bash
curl http://localhost:5000/api/health
```

**Analyze a comment:**
```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Your video is garbage 😂"
  }'
```

**Full conversion (recommended for frontend):**
```bash
curl -X POST http://localhost:5000/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Your video is absolute garbage 😂",
    "strategy": "comedian_comeback"
  }'
```

**Convert without selecting a strategy (AI picks):**
```bash
curl -X POST http://localhost:5000/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "This is factually wrong and misleading."
  }'
```

**Generate replies only:**
```bash
curl -X POST http://localhost:5000/api/generate-replies \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Your video is garbage",
    "strategy": "shakespearean_roast"
  }'
```

**Fetch YouTube comments:**
```bash
curl -X POST http://localhost:5000/api/youtube/comments \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "maxResults": 20,
    "sort": "recent"
  }'
```

**Fetch YouTube comments sorted by likes:**
```bash
curl -X POST http://localhost:5000/api/youtube/comments \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtu.be/dQw4w9WgXcQ",
    "sort": "likes",
    "maxResults": 50
  }'
```

---

## 13. Error Handling

All errors use this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Error Codes

| Code                       | HTTP | Cause                                         |
|----------------------------|------|-----------------------------------------------|
| `VALIDATION_ERROR`         | 400  | Invalid request body                          |
| `YOUTUBE_INVALID_URL`      | 400  | Not a valid YouTube URL                       |
| `YOUTUBE_VIDEO_NOT_FOUND`  | 404  | Video ID not found                            |
| `YOUTUBE_PRIVATE_VIDEO`    | 403  | Video is private                              |
| `YOUTUBE_COMMENTS_DISABLED`| 422  | Comments disabled on this video               |
| `YOUTUBE_QUOTA_EXCEEDED`   | 429  | YouTube API daily quota exceeded              |
| `YOUTUBE_API_ERROR`        | 502  | YouTube API failure                           |
| `AI_AUTH_ERROR`            | 500  | Featherless API key invalid                   |
| `AI_RATE_LIMIT`            | 429  | Featherless rate limit                        |
| `AI_TIMEOUT`               | 504  | AI request timed out                          |
| `AI_INVALID_RESPONSE`      | 502  | AI returned malformed JSON after retry        |
| `AI_SERVICE_ERROR`         | 502  | Featherless provider error                    |
| `RATE_LIMIT_EXCEEDED`      | 429  | Too many requests (global limit)              |
| `NOT_FOUND`                | 404  | Unknown route                                 |
| `INTERNAL_ERROR`           | 500  | Unexpected server error                       |

---

## 14. Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Tests run in demo mode — **no real API credentials required**.

### Test Coverage

| Test File             | What it tests                                       |
|-----------------------|-----------------------------------------------------|
| `youtube.test.ts`     | URL extraction, video ID validation                 |
| `analysis.test.ts`    | JSON utils, Gold service, sanitizer                 |
| `schema.test.ts`      | All Zod request schemas                             |
| `validation.test.ts`  | Featherless service error handling (mocked axios)   |
| `conversion.test.ts`  | Full API integration tests via supertest            |

---

## 15. Security Notes

- **API keys are never returned** in any API response
- **API keys are never logged** (Pino redact config)
- Helmet sets secure HTTP headers on every response
- CORS is restricted to `FRONTEND_URL` (no wildcard in production)
- Request bodies are limited to 50kb
- Global rate limit: 200 req / 15 min
- AI endpoint rate limit: 20 req / min (protects Featherless quota)
- All AI output is schema-validated and sanitized before returning to clients
- Raw provider error messages are never forwarded to the frontend
- Strategy input is validated against a strict allowlist — arbitrary strings are rejected with HTTP 400

---

## 16. Frontend Integration

### Quick Start

The frontend should consume these endpoints in this order for the full TrollToGold flow:

1. **Fetch comments** → `POST /api/youtube/comments`
2. **Creator selects a comment** (frontend UI)
3. **Creator selects a strategy** (optional — AI will recommend if omitted)
4. **Full conversion** → `POST /api/convert`
5. **Creator selects a reply** → save to history via `POST /api/history`

### Response Contract

All responses follow:

```json
{ "success": true, "data": { ... } }
// or
{ "success": false, "error": { "code": "...", "message": "..." } }
```

Always check `response.success` first.

### CORS

The backend allows requests from `FRONTEND_URL` (default: `http://localhost:3000`).

To allow Vite dev server: also `http://localhost:5173` is pre-allowed.

For additional origins, update `FRONTEND_URL` or modify `allowedOrigins` in `src/app.ts`.

### TypeScript Types

Import shared types from the backend's `src/types/index.ts` or copy them to the frontend project. All API response shapes are fully typed.
