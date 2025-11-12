# music-taste-agent

# cf_ai_music-taste-agent 🎵

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
- **HTML/CSS/JS** for frontend chat interface
- Optional: **Wrangler CLI** for deployment

---

## Installation & Running Locally

1. Clone the repository:

```bash
git clone https://github.com/<your-username>/cf_ai_music-taste-agent.git
cd cf_ai_music-taste-agent

 https://music-taste-agent.jiveshpjain.workers.dev
