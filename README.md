# music-taste-agent

# cf_ai_music-taste-agent 

An AI-powered music taste discovery agent built on **Cloudflare Workers** and **Durable Objects**. Users can chat with the assistant, log songs, and receive insights about their unique music preferences. The agent uses **Llama 3.3 via Workers AI** for conversational interaction and tracks listening sessions for persistent, personalized recommendations.

---

## Features

- Chat with the AI assistant to explore your music taste.
- Log songs with **artist, genre, and mood**.
- View **insights** such as top genres, top moods, and recent listening sessions based on your music interests.
- Memory/state is handled by **Durable Objects**, so your data persists between sessions.
- Optionally delete logged songs to update your profile dynamically.
- Backend built using TypeScript
- Frontend UI built using **HTML/CSS/JS**, displaying both chat and profile panels.
---
## How It Works

## How It Works

1. The user enters a message like **“Recommend me some chill electronic songs.”** or selects one of the preset options from the dialog boxes, such as **"Share Music"**, to quickly get started. As users log songs, the AI agent begins learning their interests and provides personalized song recommendations. Users can also ask the AI for song suggestions based on their mood once some songs are logged.

2. The **Cloudflare Worker** handles the backend:
   - Parses user input via `workers.ts`
   - Sends queries to **Llama 3.3** (Cloudflare Workers AI)
   - Receives recommendations and insights from the model

3. **Durable Objects** save recent chats and song logs to preserve context between sessions.

4. The **response** is streamed back to the user’s chat interface in real time, providing both chat-based interaction and insights about their music taste.

---

## Tech Stack

- **Cloudflare Workers** for backend
- **TypeScript** for backend 
- **Durable Objects** for memory/state management
- **Workers AI (Llama 3.3)** for conversational AI
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
## Dependencies

| Package                   | Version                                         
|----------------------------|--------------|
| `@cloudflare/agents`       | ^0.0.13      |
| `@cloudflare/ai`           | ^1.0.62      | 
| `base64-js`                | ^1.5.1       | 
| `@cloudflare/workers-types`| ^4.20241127.0| 
| `typescript`               | ^5.7.2       | 
| `wrangler`                 | ^3.94.0      | 

> All dependencies are locked via `package-lock.json` to ensure reproducible installs.

---

## Installation & Running Locally

1. Clone the repository:

```bash
git clone https://github.com/jiveshj/cf_ai_music-taste-agent.git
cd cf_ai_music-taste-agent
```
2. Install dependencies
```bash
npm install
```
This should install all dependencies listed in the package.json.


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
