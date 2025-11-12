import { Ai } from '@cloudflare/ai';

interface MusicPreference {
  genre: string;
  artists: string[];
  mood: string;
  timestamp: string;
}

interface ListeningSession {
  id: string;
  song: string;
  artist: string;
  genre: string;
  mood: string;
  rating?: number;
  timestamp: string;
}

interface AgentState {
  preferences: MusicPreference[];
  listeningSessions: ListeningSession[];
  conversationHistory: Array<{ role: string; content: string }>;
  profile: {
    favoriteGenres: string[];
    topMoods: string[];
    discoveredAt: string;
  };
}

export class MusicTasteAgent {
  private storage: DurableObjectStorage;
  private ai: Ai;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage;
    this.env = env;
    this.ai = new Ai(env.AI);
  }

  async getInitialState(): Promise<AgentState> {
    return {
      preferences: [],
      listeningSessions: [],
      conversationHistory: [],
      profile: {
        favoriteGenres: [],
        topMoods: [],
        discoveredAt: new Date().toISOString()
      }
    };
  }

  async chat(message: string): Promise<string> {
    let state = (await this.storage.get('state')) as AgentState | undefined;
    if (!state) {
      state = await this.getInitialState();
    }
    
    state.conversationHistory.push({
      role: 'user',
      content: message
    });

    const tasteAnalysis = this.analyzeMusicTaste(state);

    const systemPrompt = `You are a friendly music taste discovery assistant. Your goal is to help users understand their music preferences through conversation.

Current user profile:
- Favorite genres: ${tasteAnalysis.topGenres.join(', ') || 'Not yet discovered'}
- Top moods: ${tasteAnalysis.topMoods.join(', ') || 'Not yet discovered'}
- Total listening sessions: ${state.listeningSessions.length}
- Music journey started: ${new Date(state.profile.discoveredAt).toLocaleDateString()}

Recent activity: ${JSON.stringify(state.listeningSessions.slice(-3))}

Your role:
1. Ask engaging questions about their music preferences (favorite songs, artists, genres, moods)
2. Help them discover patterns in their taste (e.g., "I notice you love upbeat indie rock!")
3. Provide insights about their listening habits
4. Suggest they log songs they're currently enjoying
5. Be conversational, enthusiastic, and curious about their music journey

When they mention songs/artists, encourage them to log it. When they want insights, analyze their patterns.
Keep responses concise and friendly - like chatting with a music-loving friend.`;

    let assistantMessage = 'Tell me about some music you love!';
    try {
      const response = await this.ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast' as any, {
        messages: [
          { role: 'system', content: systemPrompt },
          ...state.conversationHistory.slice(-12)
        ],
        max_tokens: 400,
        temperature: 0.8
      });

      assistantMessage = (response as any).response || 'Tell me about some music you love!';
      
      console.log('AI Response:', response);
    } catch (error) {
      console.error('LLM Error:', error);
      assistantMessage = 'I apologize, but I\'m having trouble connecting to the AI service. Please try again in a moment!';
    }
    
    state.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    await this.extractMusicInfo(message, state);
    await this.storage.put('state', state);

    return assistantMessage;
  }

  private analyzeMusicTaste(state: AgentState): {
    topGenres: string[];
    topMoods: string[];
    insights: string[];
  } {
    const genreCounts: Record<string, number> = {};
    const moodCounts: Record<string, number> = {};

    state.listeningSessions.forEach(session => {
      genreCounts[session.genre] = (genreCounts[session.genre] || 0) + 1;
      moodCounts[session.mood] = (moodCounts[session.mood] || 0) + 1;
    });

    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    const topMoods = Object.entries(moodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([mood]) => mood);

    return { topGenres, topMoods, insights: [] };
  }

  private async extractMusicInfo(message: string, state: AgentState) {
    const lower = message.toLowerCase();
    
    const genres = ['pop', 'rock', 'hip hop', 'rap', 'indie', 'electronic', 'jazz', 'classical', 
                    'country', 'r&b', 'metal', 'folk', 'punk', 'soul', 'blues', 'reggae'];
    
    const moods = ['happy', 'sad', 'energetic', 'chill', 'romantic', 'angry', 'nostalgic', 
                   'upbeat', 'melancholic', 'peaceful', 'intense'];

    genres.forEach(genre => {
      if (lower.includes(genre) && !state.profile.favoriteGenres.includes(genre)) {
        if (state.profile.favoriteGenres.length < 10) {
          state.profile.favoriteGenres.push(genre);
        }
      }
    });

    moods.forEach(mood => {
      if (lower.includes(mood) && !state.profile.topMoods.includes(mood)) {
        if (state.profile.topMoods.length < 10) {
          state.profile.topMoods.push(mood);
        }
      }
    });
  }

  async logSong(song: string, artist: string, genre: string, mood: string, rating?: number): Promise<ListeningSession> {
    let state = (await this.storage.get('state')) as AgentState | undefined;
    if (!state) {
      state = await this.getInitialState();
    }
    
    const session: ListeningSession = {
      id: `session_${Date.now()}`,
      song,
      artist,
      genre: genre.toLowerCase(),
      mood: mood.toLowerCase(),
      rating,
      timestamp: new Date().toISOString()
    };
    
    state.listeningSessions.push(session);
    
    if (!state.profile.favoriteGenres.includes(genre.toLowerCase())) {
      state.profile.favoriteGenres.push(genre.toLowerCase());
    }
    if (!state.profile.topMoods.includes(mood.toLowerCase())) {
      state.profile.topMoods.push(mood.toLowerCase());
    }
    
    await this.storage.put('state', state);
    return session;
  }

  //  Delete song function
  async deleteSong(sessionId: string): Promise<{ success: boolean; message: string }> {
    let state = (await this.storage.get('state')) as AgentState | undefined;
    if (!state) {
      state = await this.getInitialState();
    }

    const initialLength = state.listeningSessions.length;
    state.listeningSessions = state.listeningSessions.filter(session => session.id !== sessionId);

    if (state.listeningSessions.length < initialLength) {
      // Song was deleted, recalculate profile
      await this.recalculateProfile(state);
      await this.storage.put('state', state);
      return { success: true, message: 'Song deleted successfully' };
    }

    return { success: false, message: 'Song not found' };
  }

  // Recalculate profile after deletion
  private async recalculateProfile(state: AgentState) {
    const genres = new Set<string>();
    const moods = new Set<string>();

    state.listeningSessions.forEach(session => {
      genres.add(session.genre);
      moods.add(session.mood);
    });

    state.profile.favoriteGenres = Array.from(genres);
    state.profile.topMoods = Array.from(moods);
  }

  async getTasteProfile(): Promise<{
    favoriteGenres: string[];
    topMoods: string[];
    totalSongs: number;
    recentSessions: ListeningSession[];
    insights: string[];
  }> {
    let state = (await this.storage.get('state')) as AgentState | undefined;
    if (!state) {
      state = await this.getInitialState();
    }
    const analysis = this.analyzeMusicTaste(state);
    
    return {
      favoriteGenres: analysis.topGenres,
      topMoods: analysis.topMoods,
      totalSongs: state.listeningSessions.length,
      recentSessions: state.listeningSessions.slice(-10).reverse(),
      insights: this.generateInsights(state)
    };
  }

  async getRecommendations(): Promise<ListeningSession[]> {
    let state = (await this.storage.get('state')) as AgentState | undefined;
    if (!state) state = await this.getInitialState();

    const topGenres = state.profile.favoriteGenres.slice(0, 3);
    const topMoods = state.profile.topMoods.slice(0, 3);

    if (topGenres.length === 0 && topMoods.length === 0) {
      return [];
    }

    const systemPrompt = `You are a music recommendation assistant. 
    The user likes the following genres: ${topGenres.join(', ') || 'None'} 
    and the following moods: ${topMoods.join(', ') || 'None'}. 
    Suggest 5 songs (title + artist + genre + mood) that match their taste. 
    Respond only with JSON array of objects like:
    [{"song":"Song Name","artist":"Artist","genre":"Genre","mood":"Mood"}, ...]`;

    try {
      const response: any = await this.ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast' as any, {
        messages: [
          { role: 'system', content: systemPrompt },
        ],
        max_tokens: 400,
        temperature: 0.8
      });

      let recs: ListeningSession[] = [];
      try {
        recs = JSON.parse(response.response).map((s: any, idx: number) => ({
          id: `rec_${Date.now()}_${idx}`,
          song: s.song,
          artist: s.artist,
          genre: s.genre.toLowerCase(),
          mood: s.mood.toLowerCase(),
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        console.error('Failed to parse recommendations:', err);
      }
      return recs;
    } catch (err) {
      console.error('AI recommendation error:', err);
      return [];
    }
  }

  private generateInsights(state: AgentState): string[] {
    const insights: string[] = [];
    
    if (state.listeningSessions.length === 0) {
      return ['Start logging songs to discover your music taste!'];
    }

    const analysis = this.analyzeMusicTaste(state);
    
    if (analysis.topGenres.length > 0) {
      insights.push(`Your top genre is ${analysis.topGenres[0]}`);
    }
    
    if (analysis.topMoods.length > 0) {
      insights.push(`You often listen to ${analysis.topMoods[0]} music`);
    }
    
    if (state.listeningSessions.length >= 10) {
      insights.push(`You've logged ${state.listeningSessions.length} songs - your taste is taking shape!`);
    }

    return insights;
  }

  async getListeningSessions(): Promise<ListeningSession[]> {
    let state = (await this.storage.get('state')) as AgentState | undefined;
    if (!state) {
      state = await this.getInitialState();
    }
    return state.listeningSessions.slice().reverse();
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Chat
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        const { message } = await request.json() as { message: string };
        const response = await this.chat(message);
        return new Response(JSON.stringify({ response }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Log song
      if (url.pathname === '/api/log-song' && request.method === 'POST') {
        const { song, artist, genre, mood, rating } = await request.json() as {
          song: string;
          artist: string;
          genre: string;
          mood: string;
          rating?: number;
        };
        const session = await this.logSong(song, artist, genre, mood, rating);
        return new Response(JSON.stringify({ session }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Delete song endpoint
      if (url.pathname === '/api/delete-song' && request.method === 'DELETE') {
        const { sessionId } = await request.json() as { sessionId: string };
        const result = await this.deleteSong(sessionId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Music recommendations
      if (url.pathname === '/api/recommendations' && request.method === 'GET') {
        const recs = await this.getRecommendations();
        return new Response(JSON.stringify({ recommendations: recs }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Profile
      if (url.pathname === '/api/profile' && request.method === 'GET') {
        const profile = await this.getTasteProfile();
        return new Response(JSON.stringify(profile), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Sessions
      if (url.pathname === '/api/sessions' && request.method === 'GET') {
        const sessions = await this.getListeningSessions();
        return new Response(JSON.stringify({ sessions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    } catch (error) {
      console.error('Durable Object error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

export interface Env {
  AI: any;
  MUSIC_AGENT: DurableObjectNamespace;
  ASSETS: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      const agentId = env.MUSIC_AGENT.idFromName('user_default');
      const agent = env.MUSIC_AGENT.get(agentId);

      if (url.pathname.startsWith('/api/')) {
        try {
          const stubResponse = await agent.fetch(request);
          const body = await stubResponse.text();
          const headers = new Headers(stubResponse.headers);
          Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
          return new Response(body, { status: stubResponse.status, headers });
        } catch (error) {
          console.error('DO fetch error:', error);
          return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
