// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VENIRE PLACES — MOCK DATA & BACKEND SPEC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// This file powers the Places feature while the backend is
// being built. Replace mock API calls with real ones once
// the endpoints below are live.
//
// ──────────────────────────────────────────────────────────
// BACKEND API SPEC — REQUIRED ENDPOINTS
// ──────────────────────────────────────────────────────────
//
// BASE: https://venire-backend.onrender.com/api/v1
//
// ┌─────────────────────────────────────────────────────────┐
// │ 1. GET /place                                           │
// │    Fetch paginated places feed                          │
// │    Auth: optional (guests can browse)                   │
// │    Query params:                                        │
// │      page       number   default 1                      │
// │      limit      number   default 10                     │
// │      category   string   "all" | "restaurant" |         │
// │                          "cafe" | "bar" | "lounge" |    │
// │                          "park" | "beach" | "other"     │
// │      city       string   optional filter by city        │
// │      search     string   optional search by name        │
// │    Response:                                            │
// │      { success, data: Place[], pagination: {            │
// │          page, limit, total, hasMore } }                │
// ├─────────────────────────────────────────────────────────┤
// │ 2. GET /place/explore                                   │
// │    Public endpoint — same as /place but no auth needed  │
// │    Same query params as above                           │
// ├─────────────────────────────────────────────────────────┤
// │ 3. GET /place/key?key=_id&value=:id                     │
// │    Fetch a single place by ID                           │
// │    Auth: optional                                       │
// │    Response: { success, data: Place }                   │
// ├─────────────────────────────────────────────────────────┤
// │ 4. POST /place                                          │
// │    Upload a new place post                              │
// │    Auth: REQUIRED (Bearer token)                        │
// │    Content-Type: multipart/form-data                    │
// │    Body fields:                                         │
// │      name        string    REQUIRED place/venue name    │
// │      category    string    REQUIRED (see options above) │
// │      description string    REQUIRED                     │
// │      address     string    REQUIRED                     │
// │      city        string    REQUIRED                     │
// │      rating      number    1–5 (one decimal)            │
// │      priceRange  string    "₦" | "₦₦" | "₦₦₦" | "₦₦₦₦" │
// │      tags        string[]  optional                     │
// │      lat         string    optional GPS latitude        │
// │      long        string    optional GPS longitude       │
// │      media       File[]    REQUIRED ≥1 image or video   │
// │                            max 5 files, 50MB each       │
// │    Response: { success, data: Place }                   │
// ├─────────────────────────────────────────────────────────┤
// │ 5. POST /place/like                                     │
// │    Like a place post                                    │
// │    Auth: REQUIRED                                       │
// │    Body: { placeId: string }                            │
// │    Response: { success, message }                       │
// ├─────────────────────────────────────────────────────────┤
// │ 6. POST /place/unlike                                   │
// │    Unlike a place post                                  │
// │    Auth: REQUIRED                                       │
// │    Body: { placeId: string }                            │
// │    Response: { success, message }                       │
// ├─────────────────────────────────────────────────────────┤
// │ 7. POST /place/save                                     │
// │    Save/bookmark a place post                           │
// │    Auth: REQUIRED                                       │
// │    Body: { placeId: string }                            │
// │    Response: { success, message }                       │
// ├─────────────────────────────────────────────────────────┤
// │ 8. POST /place/unsave                                   │
// │    Remove saved place                                   │
// │    Auth: REQUIRED                                       │
// │    Body: { placeId: string }                            │
// │    Response: { success, message }                       │
// ├─────────────────────────────────────────────────────────┤
// │ 9. GET /place/comment?placeId=:id                       │
// │    Fetch comments for a place                           │
// │    Auth: optional                                       │
// │    Query: placeId, page, limit                          │
// │    Response: { success, data: Comment[], pagination }   │
// ├─────────────────────────────────────────────────────────┤
// │ 10. POST /place/comment                                 │
// │     Post a comment on a place                           │
// │     Auth: REQUIRED                                      │
// │     Body: { placeId: string, text: string }             │
// │     Response: { success, data: Comment }                │
// ├─────────────────────────────────────────────────────────┤
// │ 11. DELETE /place/:id                                   │
// │     Delete own place post                               │
// │     Auth: REQUIRED (must be the poster)                 │
// │     Response: { success, message }                      │
// └─────────────────────────────────────────────────────────┘
//
// ──────────────────────────────────────────────────────────
// PLACE OBJECT SHAPE (what the API should return)
// ──────────────────────────────────────────────────────────
//
// Place {
//   _id:          string       MongoDB ObjectId
//   name:         string       Venue / place name
//   category:     string       restaurant|cafe|bar|lounge|park|beach|other
//   description:  string       User's experience description
//   address:      string       Full street address
//   city:         string       City name
//   lat:          string?      GPS latitude (optional)
//   long:         string?      GPS longitude (optional)
//   rating:       number       1.0 – 5.0 (poster's own rating)
//   priceRange:   string       "₦" | "₦₦" | "₦₦₦" | "₦₦₦₦"
//   tags:         string[]     User-added tags
//   media:        PlaceMedia[] Array of {type:"image"|"video", uri:string}
//   postedBy: {
//     _id:              string
//     firstname:        string
//     lastname:         string
//     profile_picture:  string
//   }
//   totalLikes:   number
//   totalComments:number
//   totalSaves:   number
//   hasLiked:     boolean   computed per auth user (false for guests)
//   hasSaved:     boolean   computed per auth user (false for guests)
//   createdAt:    ISO8601 string
//   updatedAt:    ISO8601 string
// }
//
// Comment {
//   _id:       string
//   placeId:   string
//   userId: {  _id, firstname, lastname, profile_picture }
//   text:      string
//   createdAt: ISO8601 string
// }
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BACKEND DEVELOPER NOTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 1. Media files should be uploaded to Cloudinary (or S3).
//    Store the resulting public URLs in the media array.
//    Videos should also store a thumbnail URL for fast loading.
//
// 2. hasLiked and hasSaved must be computed per authenticated
//    user on every GET request. For guests, both are false.
//
// 3. The /place/explore endpoint should be publicly accessible
//    (no auth required) so guests can browse places.
//    Add it to the PUBLIC_ENDPOINTS list in axiosInstance.js.
//
// 4. For the feed (/place), sort by:
//    - createdAt DESC (newest first) as default
//    - Future: location-based sort once GPS is added
//
// 5. Index the `category`, `city`, and `createdAt` fields
//    in MongoDB for fast filtering and pagination.
//
// 6. Validate media uploads:
//    - Max 5 files per post
//    - Max 50MB per file
//    - Accepted types: image/jpeg, image/png, video/mp4, video/mov
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const MOCK_PLACES = [
  {
    _id: "place_001",
    name: "Nok by Alara",
    category: "restaurant",
    description: "Stepped into Nok for a date night and the vibe was everything 🔥 Pan-African cuisine done to perfection. The jollof risotto hit different and the interior is absolutely stunning — perfect for photos. Highly recommend the rooftop seating at golden hour.",
    address: "12a Akin Olugbade St, Victoria Island",
    city: "Lagos",
    lat: "6.4297",
    long: "3.4022",
    rating: 4.8,
    priceRange: "₦₦₦",
    tags: ["fine dining", "date night", "pan-african", "rooftop"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/262047/pexels-photo-262047.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_001",
      firstname: "Chioma",
      lastname: "Obi",
      profile_picture: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    totalLikes: 842,
    totalComments: 134,
    totalSaves: 210,
    hasLiked: false,
    hasSaved: false,
    createdAt: "2026-06-10T18:30:00.000Z",
  },
  {
    _id: "place_002",
    name: "Reverie Social House",
    category: "cafe",
    description: "Found my new favourite work spot in Lagos 🤍 The coffee is genuinely amazing, WiFi is fast and reliable, and the aesthetic is 10/10 for content creation. The iced brown sugar latte is a must-order. Always packed on weekends so go early.",
    address: "2b Babatunde Jose St, Victoria Island",
    city: "Lagos",
    lat: "6.4312",
    long: "3.4190",
    rating: 4.6,
    priceRange: "₦₦",
    tags: ["coffee", "work spot", "aesthetic", "WiFi"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_002",
      firstname: "Emeka",
      lastname: "Nwosu",
      profile_picture: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    totalLikes: 523,
    totalComments: 76,
    totalSaves: 188,
    hasLiked: true,
    hasSaved: true,
    createdAt: "2026-06-12T10:15:00.000Z",
  },
  {
    _id: "place_003",
    name: "Lekki Conservation Centre",
    category: "park",
    description: "If you've never walked the longest canopy walkway in Africa, you're missing out 🌿 The LCC is a hidden gem for nature lovers in Lagos. Bring your camera, wear comfortable shoes and get there early before the heat kicks in. Pure serenity.",
    address: "Lekki-Epe Expressway, Lekki",
    city: "Lagos",
    lat: "6.4478",
    long: "3.5643",
    rating: 4.7,
    priceRange: "₦",
    tags: ["nature", "canopy walk", "outdoor", "photography"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/235615/pexels-photo-235615.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/1834403/pexels-photo-1834403.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_003",
      firstname: "Aisha",
      lastname: "Bello",
      profile_picture: "https://randomuser.me/api/portraits/women/28.jpg",
    },
    totalLikes: 1204,
    totalComments: 203,
    totalSaves: 445,
    hasLiked: false,
    hasSaved: false,
    createdAt: "2026-06-08T07:45:00.000Z",
  },
  {
    _id: "place_004",
    name: "Sky Bar — The Civic Centre",
    category: "bar",
    description: "Sunset drinks with the best view of Victoria Island — Sky Bar is undefeated 🍹✨ The cocktail menu is creative and the open-air setting makes it feel like you're floating above Lagos. Dress code enforced, so dress up! Best visited Thursday–Saturday.",
    address: "The Civic Centre, Ozumba Mbadiwe Ave, Victoria Island",
    city: "Lagos",
    lat: "6.4253",
    long: "3.4198",
    rating: 4.5,
    priceRange: "₦₦₦",
    tags: ["rooftop", "cocktails", "sunset", "views", "nightlife"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/1581384/pexels-photo-1581384.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/2417855/pexels-photo-2417855.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_004",
      firstname: "Tunde",
      lastname: "Adeyemi",
      profile_picture: "https://randomuser.me/api/portraits/men/55.jpg",
    },
    totalLikes: 678,
    totalComments: 89,
    totalSaves: 234,
    hasLiked: true,
    hasSaved: false,
    createdAt: "2026-06-14T20:00:00.000Z",
  },
  {
    _id: "place_005",
    name: "Tarkwa Bay Beach",
    category: "beach",
    description: "The calmest beach in Lagos — no aggressive waves, clean water and a real chill atmosphere 🏖️ You take a boat from Tarzan jetty (about 10 mins ride). The boat experience alone is worth it. Bring your own food and drinks because vendors are limited. Perfect escape from Lagos chaos.",
    address: "Tarkwa Bay (boat from Tarzan Jetty, Marina)",
    city: "Lagos",
    lat: "6.3956",
    long: "3.3970",
    rating: 4.4,
    priceRange: "₦",
    tags: ["beach", "boat ride", "calm water", "escape", "weekend"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/1268869/pexels-photo-1268869.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_005",
      firstname: "Ngozi",
      lastname: "Eze",
      profile_picture: "https://randomuser.me/api/portraits/women/63.jpg",
    },
    totalLikes: 2341,
    totalComments: 312,
    totalSaves: 876,
    hasLiked: false,
    hasSaved: true,
    createdAt: "2026-06-05T11:30:00.000Z",
  },
  {
    _id: "place_006",
    name: "Ember Creek",
    category: "lounge",
    description: "Ember Creek is exactly the vibe you need after a long week 🎶 Low lighting, great music (no eardrums destruction), proper cocktails and staff that actually treat you well. The private booth sections are perfect for small groups. This place doesn't miss.",
    address: "19 Ajanaku St, Opebi, Ikeja",
    city: "Lagos",
    lat: "6.5651",
    long: "3.3529",
    rating: 4.6,
    priceRange: "₦₦",
    tags: ["lounge", "cocktails", "live music", "chill", "date"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/1579739/pexels-photo-1579739.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_006",
      firstname: "Dayo",
      lastname: "Okafor",
      profile_picture: "https://randomuser.me/api/portraits/men/41.jpg",
    },
    totalLikes: 934,
    totalComments: 145,
    totalSaves: 320,
    hasLiked: false,
    hasSaved: false,
    createdAt: "2026-06-11T22:00:00.000Z",
  },
  {
    _id: "place_007",
    name: "Millennium Park",
    category: "park",
    description: "Abuja's crown jewel 🌳 Millennium Park is massive, beautifully kept and so peaceful. Great for morning jogs, family picnics, or just sitting and watching the city breathe. The fountain at sunset is genuinely one of the most beautiful sights in Nigeria.",
    address: "Millennium Park, Maitama, Abuja",
    city: "Abuja",
    lat: "9.0579",
    long: "7.4951",
    rating: 4.7,
    priceRange: "₦",
    tags: ["park", "picnic", "family", "jogging", "fountain"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/1974927/pexels-photo-1974927.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/1687343/pexels-photo-1687343.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_007",
      firstname: "Fatima",
      lastname: "Ibrahim",
      profile_picture: "https://randomuser.me/api/portraits/women/17.jpg",
    },
    totalLikes: 1567,
    totalComments: 234,
    totalSaves: 567,
    hasLiked: true,
    hasSaved: true,
    createdAt: "2026-06-03T08:00:00.000Z",
  },
  {
    _id: "place_008",
    name: "Cactus Restaurant",
    category: "restaurant",
    description: "Cactus is an institution in Lagos and for good reason 🌮 The view of the lagoon from the terrace is stunning especially at dinner time. Food quality is consistently good across every visit. The prawn linguine and grilled sea bass are personal favourites. Worth every kobo.",
    address: "1 Lake Chad Crescent, Maitama, Abuja",
    city: "Abuja",
    lat: "6.4281",
    long: "3.4219",
    rating: 4.5,
    priceRange: "₦₦₦",
    tags: ["lagoon view", "seafood", "terrace", "classic"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_008",
      firstname: "Seun",
      lastname: "Martins",
      profile_picture: "https://randomuser.me/api/portraits/men/22.jpg",
    },
    totalLikes: 756,
    totalComments: 98,
    totalSaves: 189,
    hasLiked: false,
    hasSaved: false,
    createdAt: "2026-06-09T19:00:00.000Z",
  },
  {
    _id: "place_009",
    name: "The Grind Coffee Bar",
    category: "cafe",
    description: "Best specialty coffee in Port Harcourt, full stop ☕ They source beans locally from Jos which makes the flavour profiles unique. The avocado toast is fresh and generous. Quiet enough to work, warm enough to just sit and read. This is my happy place.",
    address: "45 Olu Obasanjo Road, Port Harcourt",
    city: "Port Harcourt",
    lat: "4.8156",
    long: "7.0498",
    rating: 4.9,
    priceRange: "₦₦",
    tags: ["specialty coffee", "local beans", "work café", "avocado toast"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_009",
      firstname: "Chiamaka",
      lastname: "Orji",
      profile_picture: "https://randomuser.me/api/portraits/women/36.jpg",
    },
    totalLikes: 432,
    totalComments: 56,
    totalSaves: 143,
    hasLiked: false,
    hasSaved: false,
    createdAt: "2026-06-07T09:30:00.000Z",
  },
  {
    _id: "place_010",
    name: "Elegushi Private Beach",
    category: "beach",
    description: "Elegushi hits different when you go on a weekday 🌊 Way less crowded, vendors are cool, and the water is actually clean. Weekend evenings have DJs and the vibe is insane — it becomes a full beach party. Entry is cheap and the experience is premium. Lagos never disappoints.",
    address: "Ikate-Elegushi, Lekki Phase 1",
    city: "Lagos",
    lat: "6.4355",
    long: "3.4920",
    rating: 4.3,
    priceRange: "₦",
    tags: ["beach party", "DJ", "sunset", "affordable", "weekend"],
    media: [
      { type: "image", uri: "https://images.pexels.com/photos/1321909/pexels-photo-1321909.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/994605/pexels-photo-994605.jpeg?auto=compress&cs=tinysrgb&w=800" },
      { type: "image", uri: "https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=800" },
    ],
    postedBy: {
      _id: "user_010",
      firstname: "Biodun",
      lastname: "Adewale",
      profile_picture: "https://randomuser.me/api/portraits/men/68.jpg",
    },
    totalLikes: 3102,
    totalComments: 421,
    totalSaves: 1023,
    hasLiked: false,
    hasSaved: false,
    createdAt: "2026-06-06T16:00:00.000Z",
  },
];

// Category metadata used by the filter pills UI
export const PLACE_CATEGORIES = [
  { key: "all",        label: "All",        icon: "grid-outline",         color: "#5A31F4", bg: "#F3EDFF" },
  { key: "restaurant", label: "Food",       icon: "restaurant-outline",   color: "#E05E2B", bg: "#FEF0EB" },
  { key: "cafe",       label: "Café",       icon: "cafe-outline",         color: "#7C4A03", bg: "#FEF3E2" },
  { key: "bar",        label: "Bar",        icon: "wine-outline",         color: "#8B2BAF", bg: "#F5E8FF" },
  { key: "lounge",     label: "Lounge",     icon: "musical-notes-outline",color: "#1A6BAF", bg: "#E8F3FF" },
  { key: "park",       label: "Park",       icon: "leaf-outline",         color: "#1A7A3E", bg: "#E8F7EF" },
  { key: "beach",      label: "Beach",      icon: "sunny-outline",        color: "#C08000", bg: "#FEF9E6" },
  { key: "other",      label: "Other",      icon: "location-outline",     color: "#555",    bg: "#F0F0F0" },
];

export default MOCK_PLACES;
