// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VENIRE REELS MOCK DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 
// This mock data represents the expected
// API response shape for the reels feed.
//
// BACKEND SPEC:
// Endpoint: GET /event/reels
// Query params: 
//   page (number, default 1)
//   limit (number, default 10)
// Auth: Bearer token (optional — 
//   guests can view reels too)
//
// Response shape:
// {
//   success: true,
//   data: ReelEvent[],
//   pagination: {
//     page: number,
//     limit: number,
//     total: number,
//     hasMore: boolean
//   }
// }
//
// A ReelEvent is the same as a regular
// Event object but MUST have at least
// one video in the videos array.
// Events with only images are shown 
// as static reels (image background).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const MOCK_REELS = [
  {
    _id: "reel_001",
    name: "Annual Tech Summit Lagos 2026",
    description: "Join Nigeria's biggest gathering of tech professionals, founders, and investors. Three days of talks, workshops, and networking.",
    address: "Eko Hotel & Suites, Victoria Island",
    lat: "6.4281",
    long: "3.4219",
    capacity: 500,
    isTicket: true,
    ticketAmount: 15000,
    isSponsored: false,
    start: "2026-06-15T09:00:00.000Z",
    end: "2026-06-17T18:00:00.000Z",
    userStatus: "pending",
    categoryId: "cat_tech",
    type: "videos",
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    ],
    images: [
      "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    userId: {
      _id: "user_001",
      firstname: "David",
      lastname: "Adeleke",
      profile_picture: "https://randomuser.me/api/portraits/men/32.jpg",
      email: "david.a@example.com"
    },
    likes: [],
    totalLikes: 342,
    totalComments: 89,
    hasLiked: false,
    hasBookmarked: false,
    hasInterested: false,
    hasViewed: false,
    isOrganizer: true,
    isHost: false,
  },
  {
    _id: "reel_002",
    name: "Gospel Night — Worship & Praise",
    description: "An unforgettable night of worship featuring top gospel artists from across Nigeria. Come experience the power of praise.",
    address: "National Theatre, Lagos Island",
    lat: "6.4541",
    long: "3.3947",
    capacity: 5000,
    isTicket: false,
    ticketAmount: 0,
    isSponsored: true,
    sponsorAmount: 500000,
    start: "2026-06-20T18:00:00.000Z",
    end: "2026-06-20T23:00:00.000Z",
    userStatus: "pending",
    categoryId: "cat_religion",
    type: "videos",
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    ],
    images: [
      "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    userId: {
      _id: "user_002",
      firstname: "Grace",
      lastname: "Nnaji",
      profile_picture: "https://randomuser.me/api/portraits/women/44.jpg",
      email: "grace.n@example.com"
    },
    likes: [],
    totalLikes: 1204,
    totalComments: 312,
    hasLiked: false,
    hasBookmarked: true,
    hasInterested: true,
    hasViewed: true,
    isOrganizer: false,
    isHost: false,
  },
  {
    _id: "reel_003",
    name: "Naija Food Festival 2026",
    description: "Celebrating the best of Nigerian cuisine. Over 50 vendors, live cooking demos, and a whole lot of vibes.",
    address: "Millennium Park, Abuja",
    lat: "9.0579",
    long: "7.4951",
    capacity: 2000,
    isTicket: true,
    ticketAmount: 5000,
    isSponsored: false,
    start: "2026-07-01T11:00:00.000Z",
    end: "2026-07-01T20:00:00.000Z",
    userStatus: "pending",
    categoryId: "cat_food",
    type: "videos",
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    ],
    images: [
      "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    userId: {
      _id: "user_003",
      firstname: "Amara",
      lastname: "Nwosu",
      profile_picture: "https://randomuser.me/api/portraits/women/28.jpg",
      email: "amara.n@example.com"
    },
    likes: [],
    totalLikes: 876,
    totalComments: 143,
    hasLiked: true,
    hasBookmarked: false,
    hasInterested: false,
    hasViewed: true,
    isOrganizer: true,
    isHost: true,
  },
  {
    _id: "reel_004",
    name: "Afrobeats Live Concert",
    description: "The hottest Afrobeats artists under one roof. Dance, vibe, and make memories that last forever.",
    address: "Tafawa Balewa Square, Lagos",
    lat: "6.4541",
    long: "3.3947",
    capacity: 10000,
    isTicket: true,
    ticketAmount: 25000,
    isSponsored: true,
    sponsorAmount: 2000000,
    start: "2026-07-10T19:00:00.000Z",
    end: "2026-07-11T02:00:00.000Z",
    userStatus: "pending",
    categoryId: "cat_music",
    type: "videos",
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
    ],
    images: [
      "https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    userId: {
      _id: "user_004",
      firstname: "Tunde",
      lastname: "Bakare",
      profile_picture: "https://randomuser.me/api/portraits/men/55.jpg",
      email: "tunde.b@example.com"
    },
    likes: [],
    totalLikes: 4521,
    totalComments: 892,
    hasLiked: false,
    hasBookmarked: false,
    hasInterested: false,
    hasViewed: false,
    isOrganizer: false,
    isHost: false,
  },
  {
    _id: "reel_005",
    name: "Startup Pitch Night — Season 4",
    description: "Watch 10 Nigerian startups pitch live to a panel of investors. Network, learn, and maybe find your next co-founder.",
    address: "Co-Creation Hub, Yaba, Lagos",
    lat: "6.5105",
    long: "3.3791",
    capacity: 200,
    isTicket: true,
    ticketAmount: 3500,
    isSponsored: false,
    start: "2026-06-28T17:00:00.000Z",
    end: "2026-06-28T22:00:00.000Z",
    userStatus: "ongoing",
    categoryId: "cat_business",
    type: "videos",
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
    ],
    images: [
      "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    userId: {
      _id: "user_005",
      firstname: "Chidi",
      lastname: "Okonkwo",
      profile_picture: "https://randomuser.me/api/portraits/men/41.jpg",
      email: "chidi.o@example.com"
    },
    likes: [],
    totalLikes: 234,
    totalComments: 67,
    hasLiked: false,
    hasBookmarked: true,
    hasInterested: true,
    hasViewed: false,
    isOrganizer: true,
    isHost: false,
  },
  {
    _id: "reel_006",
    name: "Fashion Week Abuja 2026",
    description: "Nigeria's premier fashion showcase. Runway shows, designer exhibitions and after parties.",
    address: "Transcorp Hilton, Abuja",
    lat: "9.0579",
    long: "7.4951",
    capacity: 800,
    isTicket: true,
    ticketAmount: 20000,
    isSponsored: true,
    sponsorAmount: 1000000,
    start: "2026-08-05T12:00:00.000Z",
    end: "2026-08-07T22:00:00.000Z",
    userStatus: "pending",
    categoryId: "cat_fashion",
    type: "images",
    videos: [],
    images: [
      "https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/2220316/pexels-photo-2220316.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    userId: {
      _id: "user_006",
      firstname: "Ngozi",
      lastname: "Eze",
      profile_picture: "https://randomuser.me/api/portraits/women/63.jpg",
      email: "ngozi.e@example.com"
    },
    likes: [],
    totalLikes: 1876,
    totalComments: 234,
    hasLiked: true,
    hasBookmarked: true,
    hasInterested: true,
    hasViewed: true,
    isOrganizer: false,
    isHost: false,
  },
  {
    _id: "reel_007",
    name: "Youth Empowerment Summit",
    description: "Skills, mentorship and funding opportunities for Nigerian youth aged 18-35. Free entry, big value.",
    address: "Ahmadu Bello Stadium, Kaduna",
    lat: "10.5105",
    long: "7.4165",
    capacity: 3000,
    isTicket: false,
    ticketAmount: 0,
    isSponsored: false,
    start: "2026-07-20T09:00:00.000Z",
    end: "2026-07-20T17:00:00.000Z",
    userStatus: "pending",
    categoryId: "cat_education",
    type: "videos",
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4"
    ],
    images: [
      "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    userId: {
      _id: "user_007",
      firstname: "Aisha",
      lastname: "Bello",
      profile_picture: "https://randomuser.me/api/portraits/women/17.jpg",
      email: "aisha.b@example.com"
    },
    likes: [],
    totalLikes: 567,
    totalComments: 98,
    hasLiked: false,
    hasBookmarked: false,
    hasInterested: false,
    hasViewed: false,
    isOrganizer: true,
    isHost: true,
  },
  {
    _id: "reel_008",
    name: "Comedy Night — Laugh Factory",
    description: "Nigeria's funniest comedians on one stage. A night of pure laughter guaranteed.",
    address: "Terra Kulture, Victoria Island",
    lat: "6.4281",
    long: "3.4219",
    capacity: 300,
    isTicket: true,
    ticketAmount: 8000,
    isSponsored: false,
    start: "2026-06-25T20:00:00.000Z",
    end: "2026-06-25T23:30:00.000Z",
    userStatus: "completed",
    categoryId: "cat_comedy",
    type: "videos",
    videos: [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
    ],
    images: [
      "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800"
    ],
    userId: {
      _id: "user_008",
      firstname: "Emeka",
      lastname: "Ike",
      profile_picture: "https://randomuser.me/api/portraits/men/22.jpg",
      email: "emeka.i@example.com"
    },
    likes: [],
    totalLikes: 2341,
    totalComments: 445,
    hasLiked: true,
    hasBookmarked: false,
    hasInterested: false,
    hasViewed: true,
    isOrganizer: false,
    isHost: false,
  }
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BACKEND DEVELOPER NOTES:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 1. The reels endpoint should prioritize
//    events that have videos first, then
//    fill remaining slots with image-only
//    events.
//
// 2. Personalization: once user data is 
//    available, sort reels by:
//    - User's location (nearby events first)
//    - Categories user has interacted with
//    - Most liked/commented events
//    - Sponsored events (weighted boost)
//
// 3. The hasLiked, hasBookmarked, 
//    hasInterested, hasViewed fields must 
//    be computed per authenticated user.
//    For guests, all return false.
//
// 4. Sponsored events (isSponsored: true)
//    should appear at most every 4th reel
//    to avoid annoying users.
//
// 5. Pagination: use cursor-based 
//    pagination for better performance
//    on the reels feed (not page-based).
//    Return a "nextCursor" field instead
//    of page numbers.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default MOCK_REELS
