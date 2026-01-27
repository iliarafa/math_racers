import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { createRoom } from "./websocket";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Create a new multiplayer room
  app.post("/api/rooms", async (req, res) => {
    try {
      const { hostId, hostName, circuitId, driverId, questions } = req.body;
      
      if (!hostId || !hostName || !circuitId || !driverId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let roomCode = generateRoomCode();
      let attempts = 0;
      
      // Ensure unique room code
      while (attempts < 10) {
        const existing = await storage.getRoomByCode(roomCode);
        if (!existing) break;
        roomCode = generateRoomCode();
        attempts++;
      }

      const room = await storage.createRoom({
        roomCode,
        hostId,
        hostName,
        circuitId,
        driverId,
      });

      // Update with questions
      const raceLength = questions?.length || 20;
      if (questions) {
        await storage.updateRoom(roomCode, { questions });
      }

      // Initialize room in WebSocket manager with race length
      createRoom(roomCode, hostId, raceLength);

      res.json({ roomCode, room });
    } catch (error) {
      console.error("Error creating room:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create room", details: errorMessage });
    }
  });

  // Join an existing room
  app.post("/api/rooms/:code/join", async (req, res) => {
    try {
      const { code } = req.params;
      const { guestId, guestName } = req.body;

      if (!guestId || !guestName) {
        return res.status(400).json({ error: "Missing guest information" });
      }

      const room = await storage.getRoomByCode(code.toUpperCase());
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      if (room.guestId) {
        return res.status(400).json({ error: "Room is full" });
      }

      if (room.status !== "waiting") {
        return res.status(400).json({ error: "Race already started" });
      }

      const updatedRoom = await storage.updateRoom(code.toUpperCase(), {
        guestId,
        guestName,
      });

      res.json({ room: updatedRoom });
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });

  // Get room details
  app.get("/api/rooms/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomByCode(code.toUpperCase());
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      res.json({ room });
    } catch (error) {
      console.error("Error getting room:", error);
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  // Update room (for track selection before race)
  app.put("/api/rooms/:code/update", async (req, res) => {
    try {
      const { code } = req.params;
      const { circuitId, driverId, weather, questions, powerUpsEnabled } = req.body;

      const room = await storage.getRoomByCode(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const updates: any = {};
      if (circuitId !== undefined) updates.circuitId = circuitId;
      if (driverId !== undefined) updates.driverId = driverId;
      if (questions !== undefined) updates.questions = questions;
      if (powerUpsEnabled !== undefined) updates.powerUpsEnabled = powerUpsEnabled;

      const updatedRoom = await storage.updateRoom(code.toUpperCase(), updates);

      res.json({ room: updatedRoom });
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ error: "Failed to update room" });
    }
  });

  return httpServer;
}
