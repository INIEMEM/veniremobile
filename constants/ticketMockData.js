export const MOCK_TICKETS = [
  {
    _id: "tkt_001",
    event: {
      _id: "evt_001",
      name: "Annual Tech Summit Lagos 2026",
      start: "2026-06-15T09:00:00.000Z",
      address: "Eko Hotel & Suites, Victoria Island",
      images: ["https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800"]
    },
    ticketType: "VIP Pass",
    price: 15000,
    qrCodeString: "VENIRE-TKT001-TECHSUMMIT",
    status: "valid", // "valid" | "used" | "expired"
    purchaseDate: "2026-06-01T14:30:00.000Z",
    ownerName: "David Adeleke",
    ownerEmail: "david.a@example.com"
  },
  {
    _id: "tkt_002",
    event: {
      _id: "evt_003",
      name: "Naija Food Festival 2026",
      start: "2026-07-01T11:00:00.000Z",
      address: "Millennium Park, Abuja",
      images: ["https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=800"]
    },
    ticketType: "Regular Entry",
    price: 5000,
    qrCodeString: "VENIRE-TKT002-FOODFEST",
    status: "valid",
    purchaseDate: "2026-06-05T09:15:00.000Z",
    ownerName: "David Adeleke",
    ownerEmail: "david.a@example.com"
  }
];

export const MOCK_SCAN_RESPONSE = (scannedString) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock logic: randomly decide if ticket is valid based on prefix or simple randomized check
      if (scannedString.startsWith("VENIRE-TKT")) {
        // Just mock randomly, but simulate success for known strings
        resolve({
          success: true,
          data: {
            ticketId: scannedString,
            status: "Valid",
            owner: "David Adeleke",
            message: "Check-in successful!"
          }
        });
      } else {
        resolve({
          success: false,
          error: "Invalid or unrecognized QR code format."
        });
      }
    }, 1500); // simulate network delay
  });
};
