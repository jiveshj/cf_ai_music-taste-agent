# music-taste-agent

# cf_ai_music-taste-agent 

An AI-powered music taste discovery agent built on **Cloudflare Workers** and **Durable Objects**. Users can chat with the assistant, log songs, and receive insights about their unique music preferences. The agent uses **Llama 3.3 via Workers AI** for conversational interaction and tracks listening sessions for persistent, personalized recommendations.

---

## Features

- Chat with the AI assistant to explore your music taste.
- Log songs with **artist, genre, and mood**.
- View **insights** such as top genres, top moods, and recent listening sessions.
- Memory/state is handled by **Durable Objects**, so your data persists between sessions.
- Optionally delete logged songs to update your profile dynamically.
- Frontend UI built using **HTML/CSS/JS**, displaying both chat and profile panels.

---

## Tech Stack

- **Cloudflare Workers** for backend
- **Durable Objects** for memory/state management
- **Workers AI (Llama 3.3)** for conversational AI
- **TypeScript (Cloudflare Workers)** for backend 
- **HTML/CSS/JS** for frontend chat interface
- Optional: **Wrangler CLI** for deployment

---
## Project Structure
```
cf_ai_music-taste-agent/
│
├── src/
│ ├── worker.ts # Cloudflare Worker entry point
│
├── public/
│ ├── index.html # Frontend interface for chat
│
├── package.json # Project dependencies and scripts
├── package-lock.json # Locked dependency versions for reproducibility
├── wrangler.toml # Cloudflare Worker configuration
├── PROMPTS.md # AI prompts used during development
└── README.md # Project documentation
```
---
## Installation & Running Locally

1. Clone the repository:

```bash
git clone https://github.com/<your-username>/cf_ai_music-taste-agent.git
cd cf_ai_music-taste-agent
```
2. Install dependencies
```bash
npm install
```
This should install all dependencies listed in the package.json, including @cloudflare/agents, @cloudflare/ai, and @base64-js

Versions are locked by the package-lock.json, ensuring that the same versions are installed every time.

If you want to enforce exact versions:

```bash
npm ci
```
3. Run locally
```bash
npm run dev
```
Your app will be available on http://localhost:8787

---
## How It Works

1. The user enters a message like **“Recommend me some chill electronic songs.”**
2. The **Cloudflare Worker**:
   - Sends a query to **Llama 3.3** (Cloudflare Workers AI)
   - Receives recommendations and insights from the model
3. **Durable Objects** store recent chats and suggestions to preserve context.
4. The **response** is streamed back to the user’s chat interface in real time.
