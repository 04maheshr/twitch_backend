const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const http = require('http');
const { Server } = require('socket.io');
const setupChat = require('./chat.js');

const dotenv=require('dotenv')
dotenv.config();


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.get("/", async (req, res) => {
  try {
    return res.status(200).json({ message: "twitch_Backend" });
  } catch (error) {
    return res.status(500).json({ message: "twitch_Backend failed" });
  }
});




const MANAGEMENT_KEY = process.env.MANAGEMENT_KEY; // Replace with your management key
const MANAGEMENT_SECRET = process.env.MANAGEMENT_SECRET


// Function to generate management token
const generateManagementToken = async () => {
  const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds
  const payload = {
    access_key: MANAGEMENT_KEY,
    type: 'management',
    version: 2,
    jti: crypto.randomUUID(),
    iat: currentTime - 10, // Set issued at time to 10 seconds ago
    exp: currentTime + 864000, // Set expiration to 1 hour from now
  };

  const token = jwt.sign(payload, MANAGEMENT_SECRET, { algorithm: 'HS256' });
  console.log("Generated Token:", token);
  return token;
}
app.get("/", async (req, res) => {
  try {
    return res.status(200).json({ message: "twitch_Backend" });
  } catch (error) {
    return res.status(500).json({ message: "twitch_Backend failed" });
  }
});








// hi da theni 
app.post("/api/create-room", async (req, res) => {
  try {
    const token = await generateManagementToken();

    // Step 1: Create the room with a unique name
    const roomName = `New Room ${Date.now()}`; // Add timestamp to ensure unique room name
    const createRoomResponse = await fetch("https://api.100ms.live/v2/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: roomName,

        template_id: process.env.TEMPLATE_ID, // Replace with your template ID
      }),
    });

    if (!createRoomResponse.ok) {
      const errorDetails = await createRoomResponse.text();
      throw new Error("Failed to create rosom: " + createRoomResponse.statusText + " - " + errorDetails);
    }

    const roomData = await createRoomResponse.json();
    const roomId = roomData.id;
    console.log(`Room created with ID: ${roomId}`);

    // Step 2: Generate a unique room code with role "host"
    const roomCodeResponse = await fetch(`https://api.100ms.live/v2/room-codes/room/${roomId}/role/host`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!roomCodeResponse.ok) {
      const errorDetails = await roomCodeResponse.text();
      throw new Error("Failed to generate room code: " + roomCodeResponse.statusText + " - " + errorDetails);
    }

    const roomCodeData = await roomCodeResponse.json();
    const roomCode = roomCodeData.code;
    console.log(`Generated room code: ${roomCode}`);

    res.json({ roomCode });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Error creating room: " + error.message });
  }
});
app.post('/start-stream', async (req, res) => {
  console.log("Received request for starting stream:", req.body);
  const { streamKey, roomId } = req.body; // Keep both streamKey and roomId
  console.log("Received stream start request with streamKey:", streamKey, "roomId:", roomId);

  if (!streamKey || !roomId) {
    console.error("Stream key or room ID is missing.");
    return res.status(400).json({ error: "Stream key and room ID are required." });
  }

  try {
    const token = await generateManagementToken(); // Generate the management token
    console.log("Initiating streaming request to 100ms API.");
    
    const startStreamResponse = await fetch(`https://api.100ms.live/v2/external-streams/room/${roomId}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rtmp_urls: [`rtmp://live.twitch.tv/app/${streamKey}`],
        recording: false,
        resolution: { width: 1280, height: 720 }, 
      }),
    });

    // Check if the response is OK
    if (!startStreamResponse.ok) {
      const errorResponse = await startStreamResponse.json(); // This should be fine now
      console.error('Failed to start streaming:', errorResponse);
      return res.status(startStreamResponse.status).json({ error: errorResponse });
    }

    const data = await startStreamResponse.json(); // Correctly awaiting the response
    console.log('Streaming started successfully:', data);
    return res.status(200).json(data); // Return success response to client
  } catch (error) {
    console.error("Error starting stream:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.URL, // Adjusted to match your frontend port
    methods: ['GET', 'POST']
  }
});
setupChat(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
