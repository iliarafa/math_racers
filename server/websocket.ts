import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";

interface GameRoom {
  hostWs: WebSocket | null;
  guestWs: WebSocket | null;
  hostId: string;
  guestId: string | null;
  hostProgress: number;
  guestProgress: number;
  hostMistakes: number;
  guestMistakes: number;
  hostFinished: boolean;
  guestFinished: boolean;
  hostFinishTime: number | null;
  guestFinishTime: number | null;
  raceStartTime: number | null;
  raceLength: number;
  status: "waiting" | "countdown" | "racing" | "finished";
}

const rooms = new Map<string, GameRoom>();
const clientToRoom = new Map<WebSocket, { roomCode: string; playerId: string }>();

export function setupWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    log("WebSocket client connected", "ws");

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (e) {
        log(`WebSocket message error: ${e}`, "ws");
      }
    });

    ws.on("close", () => {
      const clientInfo = clientToRoom.get(ws);
      if (clientInfo) {
        const room = rooms.get(clientInfo.roomCode);
        if (room) {
          if (room.hostId === clientInfo.playerId) {
            room.hostWs = null;
            broadcastToRoom(clientInfo.roomCode, { type: "player_disconnected", player: "host" });
          } else if (room.guestId === clientInfo.playerId) {
            room.guestWs = null;
            broadcastToRoom(clientInfo.roomCode, { type: "player_disconnected", player: "guest" });
          }
        }
        clientToRoom.delete(ws);
      }
      log("WebSocket client disconnected", "ws");
    });
  });

  return wss;
}

function handleMessage(ws: WebSocket, message: any) {
  switch (message.type) {
    case "join_room":
      handleJoinRoom(ws, message);
      break;
    case "start_countdown":
      handleStartCountdown(message.roomCode);
      break;
    case "progress_update":
      handleProgressUpdate(ws, message);
      break;
    case "race_finished":
      handleRaceFinished(ws, message);
      break;
    case "mistake_update":
      handleMistakeUpdate(ws, message);
      break;
  }
}

function handleJoinRoom(ws: WebSocket, message: { roomCode: string; playerId: string; isHost: boolean }) {
  const { roomCode, playerId, isHost } = message;
  
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      hostWs: null,
      guestWs: null,
      hostId: "",
      guestId: null,
      hostProgress: 0,
      guestProgress: 0,
      hostMistakes: 0,
      guestMistakes: 0,
      hostFinished: false,
      guestFinished: false,
      hostFinishTime: null,
      guestFinishTime: null,
      raceStartTime: null,
      raceLength: 20,
      status: "waiting"
    });
  }

  const room = rooms.get(roomCode)!;
  
  if (isHost) {
    room.hostWs = ws;
    room.hostId = playerId;
  } else {
    room.guestWs = ws;
    room.guestId = playerId;
  }

  clientToRoom.set(ws, { roomCode, playerId });

  ws.send(JSON.stringify({ type: "joined", roomCode, isHost }));

  if (room.hostWs && room.guestWs) {
    broadcastToRoom(roomCode, { type: "room_ready" });
  }
}

function handleStartCountdown(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.status = "countdown";
  room.hostProgress = 0;
  room.guestProgress = 0;
  room.hostMistakes = 0;
  room.guestMistakes = 0;
  room.hostFinished = false;
  room.guestFinished = false;
  room.hostFinishTime = null;
  room.guestFinishTime = null;

  broadcastToRoom(roomCode, { type: "countdown_start" });

  let count = 5;
  const countdownInterval = setInterval(() => {
    if (count > 0) {
      broadcastToRoom(roomCode, { type: "countdown", count });
      count--;
    } else {
      clearInterval(countdownInterval);
      room.status = "racing";
      room.raceStartTime = Date.now();
      broadcastToRoom(roomCode, { type: "race_start" });
    }
  }, 1000);
}

function handleProgressUpdate(ws: WebSocket, message: { roomCode: string; progress: number; mistakes: number }) {
  const room = rooms.get(message.roomCode);
  if (!room || room.status !== "racing") return;

  const clientInfo = clientToRoom.get(ws);
  if (!clientInfo) return;

  // Validate progress is sequential (can only increment by 1)
  if (clientInfo.playerId === room.hostId) {
    if (message.progress !== room.hostProgress + 1) return; // Reject out-of-order updates
    room.hostProgress = message.progress;
    room.hostMistakes = message.mistakes;
  } else {
    if (message.progress !== room.guestProgress + 1) return; // Reject out-of-order updates
    room.guestProgress = message.progress;
    room.guestMistakes = message.mistakes;
  }

  broadcastToRoom(message.roomCode, {
    type: "opponent_progress",
    hostProgress: room.hostProgress,
    guestProgress: room.guestProgress,
    hostMistakes: room.hostMistakes,
    guestMistakes: room.guestMistakes
  });
}

function handleMistakeUpdate(ws: WebSocket, message: { roomCode: string; mistakes: number }) {
  const room = rooms.get(message.roomCode);
  if (!room || room.status !== "racing") return;

  const clientInfo = clientToRoom.get(ws);
  if (!clientInfo) return;

  // Update mistakes only (no progress change) - used for realism mode retries
  if (clientInfo.playerId === room.hostId) {
    room.hostMistakes = message.mistakes;
  } else {
    room.guestMistakes = message.mistakes;
  }

  broadcastToRoom(message.roomCode, {
    type: "opponent_progress",
    hostProgress: room.hostProgress,
    guestProgress: room.guestProgress,
    hostMistakes: room.hostMistakes,
    guestMistakes: room.guestMistakes
  });
}

function handleRaceFinished(ws: WebSocket, message: { roomCode: string; finishTime: number; mistakes: number; finalProgress: number; crashed?: boolean }) {
  const room = rooms.get(message.roomCode);
  if (!room || room.status !== "racing") return;

  const clientInfo = clientToRoom.get(ws);
  if (!clientInfo) return;

  // For crashes (realism mode 11 mistakes), skip progress validation
  const isCrash = message.crashed === true;
  
  if (!isCrash) {
    // Validate that player has completed all laps via progress_update messages
    // Stored progress must already equal raceLength (all progress updates received)
    if (message.finalProgress !== room.raceLength) {
      log(`Rejected race_finished: finalProgress ${message.finalProgress} != raceLength ${room.raceLength}`, "ws");
      return;
    }
  }
  
  if (clientInfo.playerId === room.hostId) {
    if (room.hostFinished) return; // Already finished - prevent duplicate claims
    // For crashes, skip stored progress validation
    if (!isCrash && room.hostProgress !== room.raceLength) {
      log(`Rejected host race_finished: stored progress ${room.hostProgress} != raceLength ${room.raceLength}`, "ws");
      return;
    }
    room.hostFinished = true;
    room.hostFinishTime = message.finishTime;
    room.hostMistakes = message.mistakes;
  } else {
    if (room.guestFinished) return; // Already finished - prevent duplicate claims
    // For crashes, skip stored progress validation
    if (!isCrash && room.guestProgress !== room.raceLength) {
      log(`Rejected guest race_finished: stored progress ${room.guestProgress} != raceLength ${room.raceLength}`, "ws");
      return;
    }
    room.guestFinished = true;
    room.guestFinishTime = message.finishTime;
    room.guestMistakes = message.mistakes;
  }

  if (room.hostFinished && room.guestFinished) {
    room.status = "finished";
    
    let winnerId: string;
    if (room.hostMistakes < room.guestMistakes) {
      winnerId = room.hostId;
    } else if (room.guestMistakes < room.hostMistakes) {
      winnerId = room.guestId!;
    } else {
      winnerId = room.hostFinishTime! <= room.guestFinishTime! ? room.hostId : room.guestId!;
    }

    broadcastToRoom(message.roomCode, {
      type: "race_complete",
      winnerId,
      hostFinishTime: room.hostFinishTime,
      guestFinishTime: room.guestFinishTime,
      hostMistakes: room.hostMistakes,
      guestMistakes: room.guestMistakes
    });
  } else {
    broadcastToRoom(message.roomCode, {
      type: "player_finished",
      playerId: clientInfo.playerId,
      finishTime: message.finishTime,
      mistakes: message.mistakes
    });
  }
}

function broadcastToRoom(roomCode: string, message: any) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const data = JSON.stringify(message);
  if (room.hostWs?.readyState === WebSocket.OPEN) {
    room.hostWs.send(data);
  }
  if (room.guestWs?.readyState === WebSocket.OPEN) {
    room.guestWs.send(data);
  }
}

export function createRoom(roomCode: string, hostId: string, raceLength: number = 20): void {
  rooms.set(roomCode, {
    hostWs: null,
    guestWs: null,
    hostId,
    guestId: null,
    hostProgress: 0,
    guestProgress: 0,
    hostMistakes: 0,
    guestMistakes: 0,
    hostFinished: false,
    guestFinished: false,
    hostFinishTime: null,
    guestFinishTime: null,
    raceStartTime: null,
    raceLength,
    status: "waiting"
  });
}

export function getRoomStatus(roomCode: string): GameRoom | undefined {
  return rooms.get(roomCode);
}
