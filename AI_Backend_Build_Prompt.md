# Venire AI Event Planner — Backend Build Prompt

## Context
You are building the backend for **Venire**, a world-class event planning mobile app built with React Native/Expo. The frontend is fully built. Your job is to build the **Agentic AI Event Planner** feature — the brain behind the app's AI screen (`/events/ai-create`).

This is not a simple chatbot. This is a **true AI Agent** that autonomously:
1. Understands natural language event descriptions
2. Extracts and structures all event data into the Venire event payload format
3. Searches your internal database for suitable vendors and venues
4. Reaches out to vendors via internal messaging
5. Generates event descriptions, titles, and social captions using GPT-4o
6. Creates and returns a calendar-ready event schedule
7. Streams all of these **step-by-step actions** back to the frontend in real-time so the user can see the agent "thinking"

---

## AI Stack to Use
- **LLM:** OpenAI GPT-4o (via the official `openai` Node.js SDK)
- **Orchestration:** LangChain.js (`langchain` npm package) — specifically the **Tool-calling Agent (OpenAI Functions Agent)**
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Vector Store:** Pinecone (preferred) OR MongoDB Atlas Vector Search if already in use
- **Streaming:** Server-Sent Events (SSE) to stream agent thoughts/actions to the frontend in real-time

---

## Endpoint 1: AI Event Planner Chat

### `POST /ai/event-planner`

This is the primary endpoint. The frontend sends the full conversation history on every message and the backend runs the AI Agent and streams the response back.

**Authentication:** Required — `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Plan a tech mixer next Friday in Lagos for 50 people. Tickets should be 5000 Naira." }
  ],
  "context": {
    "userId": "user_abc123",
    "location": "Lagos, Nigeria",
    "existingEventPayload": {}
  }
}
```

**Response: Server-Sent Events (SSE) Stream**

The frontend will consume a real-time SSE stream. Each event in the stream is a JSON object with a `type` field:

```
Content-Type: text/event-stream

data: {"type": "agent_thought", "content": "I need to understand the event type first..."}
data: {"type": "agent_action", "tool": "generate_event_details", "content": "Generating title and description..."}
data: {"type": "agent_action", "tool": "search_vendors", "content": "Searching for caterers in Lagos..."}
data: {"type": "agent_action", "tool": "search_venues", "content": "Looking for venues in Lagos that fit 50 people..."}
data: {"type": "agent_message", "content": "Here's your event plan! I found 3 suitable venues and 2 catering vendors nearby."}
data: {"type": "event_payload", "payload": { ...full structured event object... }}
data: {"type": "done"}
```

**Frontend expects these SSE event `type` values:**
| Type | What the frontend does |
|---|---|
| `agent_thought` | Shows as a dim italic status message above the chat |
| `agent_action` | Shows as a step card with the tool name and description |
| `agent_message` | Shows as a normal AI chat bubble |
| `event_payload` | Updates the Live Preview card with the structured event data |
| `vendor_suggestions` | Renders a horizontal scroll of vendor cards |
| `venue_suggestions` | Renders a horizontal scroll of venue cards |
| `done` | Hides the typing indicator |
| `error` | Shows an error toast |

---

## The AI Agent — Tools to Implement

Build the agent using **LangChain.js Tool-calling Agent**. The agent must have access to the following tools:

### Tool 1: `generate_event_details`
**What it does:** Takes natural language input and returns a structured event object.

**Input Schema:**
```json
{
  "userPrompt": "Plan a tech mixer for 50 people in Lagos next Friday"
}
```

**Output:** A fully structured Venire event payload:
```json
{
  "name": "Lagos Tech Mixer",
  "description": "Network with Lagos' top tech founders, engineers, and investors...",
  "address": "Victoria Island, Lagos",
  "lat": "6.4281",
  "long": "3.4219",
  "capacity": "50",
  "isTicket": true,
  "ticketAmount": 5000,
  "isSponsored": false,
  "sponsorAmount": 0,
  "start": "2026-06-20T18:00:00.000Z",
  "end": "2026-06-20T22:00:00.000Z",
  "categoryId": "tech_category_id",
  "hashtags": ["#techlagos", "#networking", "#mixer"],
  "tickets": [
    { "name": "General Admission", "price": "5000", "capacity": "40", "type": "regular", "isInviteOnly": false },
    { "name": "VIP", "price": "10000", "capacity": "10", "type": "vip", "isInviteOnly": false }
  ],
  "suggestedSocialCaption": "🚀 Lagos Tech Mixer is LIVE! Join us this Friday at VI for an evening of big ideas...",
  "suggestedSchedule": [
    { "time": "6:00 PM", "activity": "Doors Open & Registration" },
    { "time": "6:30 PM", "activity": "Networking Session" },
    { "time": "7:30 PM", "activity": "Panel Discussion: Startup Funding in Nigeria" },
    { "time": "9:00 PM", "activity": "Drinks & Open Networking" },
    { "time": "10:00 PM", "activity": "Event Close" }
  ]
}
```

### Tool 2: `search_vendors`
**What it does:** Searches the Venire vendor database using semantic search (embeddings) for vendors matching the event type and location. Returns an array of matching vendor profiles.

**Input Schema:**
```json
{
  "eventType": "tech mixer",
  "location": "Lagos",
  "categories": ["catering", "photography", "DJ"]
}
```

**Output:**
```json
{
  "vendors": [
    {
      "id": "vendor_123",
      "name": "Taste of Lagos Catering",
      "category": "catering",
      "rating": 4.8,
      "priceRange": "₦50,000 - ₦200,000",
      "location": "Lekki, Lagos",
      "avatarUrl": "https://..."
    }
  ]
}
```
> **Note:** Use OpenAI `text-embedding-3-small` to embed the vendor's category, tags, and location, and store them in Pinecone or MongoDB Atlas Vector Search. Query the vector store with the event's description to find semantically relevant vendors.

### Tool 3: `search_venues`
**What it does:** Queries the venue database for locations that match the event capacity and location.

**Input Schema:**
```json
{
  "location": "Lagos",
  "capacity": 50,
  "eventType": "networking"
}
```

**Output:**
```json
{
  "venues": [
    {
      "id": "venue_456",
      "name": "The Hub Victoria Island",
      "address": "12 Ozumba Mbadiwe Ave, VI, Lagos",
      "capacity": 80,
      "priceRange": "₦150,000 - ₦400,000",
      "amenities": ["WiFi", "Projector", "Bar"],
      "imageUrl": "https://..."
    }
  ]
}
```

### Tool 4: `message_vendor`
**What it does:** Sends an automated inquiry message to a vendor on behalf of the organizer. Creates a thread in the existing Venire messaging system.

**Input Schema:**
```json
{
  "vendorId": "vendor_123",
  "organizerId": "user_abc123",
  "eventName": "Lagos Tech Mixer",
  "eventDate": "2026-06-20T18:00:00.000Z",
  "message": "Hi! I'm planning a tech mixer for 50 people on June 20th at Victoria Island. I'd love to discuss your catering packages."
}
```

**Output:**
```json
{
  "success": true,
  "threadId": "thread_789",
  "message": "Your inquiry has been sent to Taste of Lagos Catering."
}
```

### Tool 5: `generate_event_poster_prompt`
**What it does:** Uses GPT-4o to craft an optimized DALL-E 3 image generation prompt based on the event details. Returns the prompt string. (The frontend or a separate endpoint handles the actual image generation call.)

**Input Schema:**
```json
{
  "eventName": "Lagos Tech Mixer",
  "eventType": "tech networking",
  "mood": "professional, modern, vibrant",
  "location": "Lagos"
}
```

**Output:**
```json
{
  "imagePrompt": "A sleek, modern event poster for 'Lagos Tech Mixer'. Dark background with neon purple and gold accents. Abstract digital network lines in the background. Minimal typography. Lagos skyline silhouette at the bottom. Cinematic lighting. Ultra high resolution.",
  "style": "dark-modern"
}
```

### Tool 6: `create_calendar_event`
**What it does:** Creates a calendar event entry. The frontend handles adding it to the native device calendar; this tool creates the internal record and returns the structured calendar data.

**Input Schema:**
```json
{
  "eventName": "Lagos Tech Mixer",
  "start": "2026-06-20T18:00:00.000Z",
  "end": "2026-06-20T22:00:00.000Z",
  "address": "Victoria Island, Lagos",
  "description": "Tech networking event for founders and engineers",
  "organizerId": "user_abc123"
}
```

**Output:**
```json
{
  "calendarEvent": {
    "title": "Lagos Tech Mixer",
    "startDate": "2026-06-20T18:00:00.000Z",
    "endDate": "2026-06-20T22:00:00.000Z",
    "location": "Victoria Island, Lagos",
    "notes": "Tech networking event for founders and engineers",
    "alarms": [{ "relativeOffset": -60 }, { "relativeOffset": -1440 }]
  }
}
```

---

## Endpoint 2: Generate AI Poster

### `POST /ai/generate-poster`

After the event is planned, the user can request an AI-generated poster.

**Request Body:**
```json
{
  "eventId": "event_123",
  "imagePrompt": "A sleek, modern event poster for 'Lagos Tech Mixer'..."
}
```

**What to do:**
1. Call the OpenAI Images API with `dall-e-3`, size `1024x1024`, quality `hd`
2. Download the generated image and upload it to your S3 bucket
3. Return the permanent S3 URL

**Response:**
```json
{
  "posterUrl": "https://<your-bucket>.s3.amazonaws.com/ai-posters/event_123_poster.png"
}
```

---

## Endpoint 3: AI Recommendations

### `GET /ai/recommendations?userId=<userId>&eventId=<eventId>`

Returns personalized vendor and venue recommendations based on the user's past events and interests.

**What to do:**
1. Fetch the user's past event history from the DB
2. Embed their preferences using `text-embedding-3-small`
3. Query Pinecone/MongoDB Vector Search for semantically similar vendors and venues
4. Return ranked results

**Response:**
```json
{
  "vendors": [...],
  "venues": [...]
}
```

---

## System Prompt for the Agent

Use this as the LangChain agent's system prompt:

```
You are Venire AI, an expert event planning assistant built into the Venire events app. 
You help organizers plan, structure, and launch world-class events in Africa and beyond.

When a user describes an event, you MUST:
1. ALWAYS call `generate_event_details` first to create the structured event payload.
2. ALWAYS call `search_vendors` to find relevant vendors for the event type.
3. ALWAYS call `search_venues` to find suitable venues.
4. If the user asks you to reach out to a vendor, call `message_vendor`.
5. ALWAYS end your response with a warm, helpful summary of what you've done.

You are knowledgeable about:
- Nigerian event culture, venues, and vendors
- Event pricing in West Africa (use Naira by default)
- Afrobeats, tech, fashion, corporate, and lifestyle event formats
- Ticketing structures (VIP, Early Bird, Tables, General Admission)
- Event promotion, hashtags, and social media marketing

Be conversational, warm, and professional. Make the organizer feel like they have 
a world-class event planner at their fingertips.
```

---

## Environment Variables Required
```env
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=venire-vendors
PINECONE_ENVIRONMENT=...
```

---

## Important Integration Notes for the Frontend

Once this backend is live, the frontend developer will:
1. Replace the mock `processUserIntent()` function in `app/events/ai-create.jsx` with a real SSE connection to `POST /ai/event-planner`
2. Render `agent_action` events as animated step cards in the chat (e.g., "🔍 Searching vendors in Lagos...")
3. Render `vendor_suggestions` and `venue_suggestions` as horizontal scroll cards
4. Render `event_payload` to update the Live Preview card in real-time
5. Add a "Generate Poster" button that calls `POST /ai/generate-poster`

---

## Priority Order to Build
1. `POST /ai/event-planner` with `generate_event_details` tool only (MVP)
2. `search_vendors` and `search_venues` tools (requires vector DB setup)
3. `message_vendor` tool (requires messaging system integration)
4. `POST /ai/generate-poster` endpoint
5. `GET /ai/recommendations` endpoint
