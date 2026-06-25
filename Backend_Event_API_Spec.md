# Venire Mobile: Event Creation API Specification

This document details the exact JSON payloads that the React Native frontend sends when an organizer creates or drafts an event. It also includes the expected responses the frontend anticipates from the backend.

---

## 1. Request S3 Upload URL
**Endpoint:** `PUT /auth/sign-s3`

Before submitting the event data, the frontend directly uploads media (images/videos) to AWS S3. It calls this endpoint to get a pre-signed URL.

### Request Payload
**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "fileName": "event_image_1699999999.jpg",
  "fileType": "image/jpeg"
}
```

### Expected Response
**Status:** `200 OK`
```json
{
  "uploadURL": "https://<your-bucket>.s3.<region>.amazonaws.com/event_image_1699999999.jpg?X-Amz-Algorithm=..."
}
```

---

## 2. Create Event
**Endpoint:** `POST /event`

This is the final submission after media is uploaded. The frontend sends the S3 URLs as string arrays, NOT raw files.

### Request Payload
**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Body:**
```typescript
{
  "name": string,              // Required. Event title
  "description": string,       // Required.
  "address": string,           // Required.
  "lat": string,               // Defaults to "0" if map data is unavailable
  "long": string,              // Defaults to "0" if map data is unavailable
  "capacity"?: string,         // Optional. Max attendees
  "isTicket": boolean,         // Required. true if paid, false if free
  "ticketAmount": number,      // Required. Base Price (0 if isTicket is false)
  "isSponsored": boolean,      // Required.
  "sponsorAmount": number,     // Required. (0 if isSponsored is false)
  "start": string,             // Required. ISO 8601 String (e.g., "2026-10-31T18:00:00.000Z")
  "end"?: string,              // Optional. ISO 8601 String
  "categoryId": string,        // Required. ID of the selected category
  "type": "videos" | "images", // Indicates primary media type
  "images"?: string[],         // Optional. Array of S3 URLs
  "videos"?: string[],         // Optional. Array of S3 URLs
  "isOrganizer"?: boolean,     // Optional.
  "isHost"?: boolean,          // Optional.
  "hashtags"?: string[],       // Optional. Array of strings (e.g., ["#party", "#lagos"])
  "scheduledDate"?: string,    // Optional. ISO 8601 String for scheduled publishing
  
  // Advanced Ticketing Features
  "tickets"?: {
    name: string,
    price: string,
    capacity: string,
    type: string,              // e.g., "regular", "vip", "early_bird"
    isInviteOnly: boolean
  }[],                         // Optional. Array of custom ticket tiers
  
  "promoCodes"?: {
    code: string,
    discount: string,          // percentage or fixed amount
    maxUses: string
  }[],                         // Optional. Array of promotional codes
  
  "seatingPlans"?: {
    name: string,              // e.g., "VIP Table 1"
    capacity: string,
    price: string
  }[]                          // Optional. Array of premium seat/table allocations
}
```

### Expected Response
**Status:** `201 Created` or `200 OK`
```json
{
  "message": "Event created successfully",
  "data": {
    "id": "event_123",
    // ... event details
  }
}
```

**Error Response (Status 400/500):**
The frontend parses errors from the `error` or `message` field.
```json
{
  "error": "Invalid category ID provided."
}
```

---

## 3. Save Event Draft
**Endpoint:** `POST /event/draft`

When the user taps "Save Draft", the payload structure is identical to `/event`, but almost all fields are treated as **optional** because the form may be incomplete.

### Request Payload
**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Body:**
*(Identical structure to `/event`, including all `tickets`, `promoCodes`, `seatingPlans` if they were filled out. `categoryId` and `name` are strictly required by the frontend).*

### Expected Response
**Status:** `201 Created` or `200 OK`
```json
{
  "message": "Draft saved successfully"
}
```

---

## 4. Schedule Event Publishing
**Endpoint:** `POST /event/schedule`

This endpoint should create an event that is **not visible in the public feed yet**. The backend stores it with `status: "scheduled"` and publishes it automatically when `publishAt` is reached.

The frontend currently builds this payload and saves it locally in `AsyncStorage` until this backend endpoint is ready.

### Request Payload
**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Body:**
```ts
{
  "clientScheduleId": string,  // Client-generated idempotency key, e.g. "scheduled_1781234567890"
  "status": "scheduled",
  "publishAt": string,         // Required. ISO 8601 date/time when event should become public
  "scheduledDate": string,     // Same value as publishAt for backward compatibility
  "calendarReminderRequested": boolean,

  "name": string,
  "description": string,
  "address": string,
  "lat": string,
  "long": string,
  "capacity"?: string,
  "isTicket": boolean,
  "ticketAmount": number,
  "isSponsored": boolean,
  "sponsorAmount": number,
  "start": string,
  "end"?: string,
  "categoryId": string,
  "type": "videos" | "images",
  "images"?: string[],
  "videos"?: string[],
  "isOrganizer": boolean,
  "isHost": boolean,
  "hashtags"?: string[],
  "tickets"?: {
    name: string,
    price: string,
    capacity: string,
    type: "regular" | "vip" | "early_bird" | string,
    isInviteOnly: boolean
  }[],
  "promoCodes"?: {
    code: string,
    discount: string,
    maxUses: string
  }[],
  "seatingPlans"?: {
    name: string,
    capacity: string,
    price: string
  }[]
}
```

### Example Request
```json
{
  "clientScheduleId": "scheduled_1781234567890",
  "status": "scheduled",
  "publishAt": "2026-07-01T09:00:00.000Z",
  "scheduledDate": "2026-07-01T09:00:00.000Z",
  "calendarReminderRequested": true,
  "name": "Annual Tech Summit Lagos 2026",
  "description": "A gathering of builders, founders, and investors.",
  "address": "Eko Hotel & Suites, Victoria Island",
  "lat": "6.5244",
  "long": "3.3792",
  "capacity": "500",
  "isTicket": true,
  "ticketAmount": 15000,
  "isSponsored": false,
  "sponsorAmount": 0,
  "start": "2026-07-10T10:00:00.000Z",
  "end": "2026-07-10T18:00:00.000Z",
  "categoryId": "6906815774210c52c24ceaed",
  "type": "images",
  "images": [
    "https://chaindustry.s3.eu-north-1.amazonaws.com/example.jpg"
  ],
  "isOrganizer": true,
  "isHost": true,
  "hashtags": ["#tech", "#lagos"]
}
```

### Expected Response
**Status:** `201 Created`
```json
{
  "success": true,
  "message": "Event scheduled successfully",
  "data": {
    "_id": "event_123",
    "clientScheduleId": "scheduled_1781234567890",
    "status": "scheduled",
    "publishAt": "2026-07-01T09:00:00.000Z",
    "scheduledDate": "2026-07-01T09:00:00.000Z",
    "publishedAt": null,
    "isPublished": false,
    "calendarReminderRequested": true,
    "name": "Annual Tech Summit Lagos 2026",
    "start": "2026-07-10T10:00:00.000Z",
    "createdAt": "2026-06-12T12:00:00.000Z",
    "updatedAt": "2026-06-12T12:00:00.000Z"
  }
}
```

### Backend Behavior Required
- Validate that `publishAt` is in the future.
- Validate that `end` is not before `start`.
- Store the event with `status: "scheduled"` and exclude it from public feeds until publish time.
- Support `clientScheduleId` as an idempotency key to prevent duplicate scheduled events if the client retries.
- When `publishAt` is reached, update:
  - `status: "pending"` or the normal event lifecycle status
  - `isPublished: true`
  - `publishedAt: <current ISO date>`
- Return errors in either `error` or `message` because the frontend reads both.

### Error Response
```json
{
  "success": false,
  "error": "Publish date must be in the future"
}
```
