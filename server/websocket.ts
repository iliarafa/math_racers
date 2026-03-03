import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";

interface GameRoom {
  hostWs: WebSocket | null;
  guestWs: WebSocket | null;
  hostId: string;
  guestId: string | null;
  hostName: string;
  guestName: string | null;
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
  // Power-ups state
  powerUpsEnabled: boolean;
  aeroZones: number[];
  hostOvertakeEnergy: number;
  guestOvertakeEnergy: number;
  hostAeroUsedZones: Set<number>;
  guestAeroUsedZones: Set<number>;
  hostOvertakeActive: boolean;
  guestOvertakeActive: boolean;
  hostOvertakeStartTime: number | null;
  guestOvertakeStartTime: number | null;
  hostOvertakeDuration: number;
  guestOvertakeDuration: number;
  // Sector colors for progress bar rendering
  hostSectorColors: string[];
  guestSectorColors: string[];
  // Per-sector best times for F1-style competitive timing
  sectorBestTimes: Array<{ bestTime: number; holder: 'host' | 'guest' } | null>;
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
          const isHost = room.hostId === clientInfo.playerId;
          if (isHost) {
            room.hostWs = null;
          } else if (room.guestId === clientInfo.playerId) {
            room.guestWs = null;
          }
          broadcastToRoom(clientInfo.roomCode, { type: "player_disconnected", player: isHost ? "host" : "guest" });

          // If race is in progress, auto-finish the disconnected player so the other can complete
          if (room.status === "racing") {
            if (isHost && !room.hostFinished) {
              room.hostFinished = true;
              room.hostFinishTime = 999999;
            } else if (!isHost && !room.guestFinished) {
              room.guestFinished = true;
              room.guestFinishTime = 999999;
            }

            // If the other player already finished, resolve the race
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
              broadcastToRoom(clientInfo.roomCode, {
                type: "race_complete",
                winnerId,
                hostFinishTime: room.hostFinishTime,
                guestFinishTime: room.guestFinishTime,
                hostMistakes: room.hostMistakes,
                guestMistakes: room.guestMistakes
              });
            }
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
      handleStartCountdown(message.roomCode, message.circuitId, message.driverId, message.weather, message.powerUpsEnabled, message.questions, message.raceLength, message.aeroZones);
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
    case "toggle_power_ups":
      handleTogglePowerUps(ws, message);
      break;
    case "energy_update":
      handleEnergyUpdate(ws, message);
      break;
    case "activate_overtake":
      handleActivateOvertake(ws, message);
      break;
    case "deactivate_overtake":
      handleDeactivateOvertake(ws, message);
      break;
    case "activate_aero":
      handleActivateAero(ws, message);
      break;
  }
}

function handleJoinRoom(ws: WebSocket, message: { roomCode: string; playerId: string; isHost: boolean; playerName?: string }) {
  const { roomCode, playerId, isHost, playerName } = message;

  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      hostWs: null,
      guestWs: null,
      hostId: "",
      guestId: null,
      hostName: "",
      guestName: null,
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
      status: "waiting",
      // Power-ups initialization
      powerUpsEnabled: true,
      aeroZones: [],
      hostOvertakeEnergy: 0,
      guestOvertakeEnergy: 0,
      hostAeroUsedZones: new Set(),
      guestAeroUsedZones: new Set(),
      hostOvertakeActive: false,
      guestOvertakeActive: false,
      hostOvertakeStartTime: null,
      guestOvertakeStartTime: null,
      hostOvertakeDuration: 0,
      guestOvertakeDuration: 0,
      hostSectorColors: [],
      guestSectorColors: [],
      sectorBestTimes: [],
    });
  }

  const room = rooms.get(roomCode)!;

  if (isHost) {
    room.hostWs = ws;
    room.hostId = playerId;
    if (playerName) room.hostName = playerName;
  } else {
    room.guestWs = ws;
    room.guestId = playerId;
    if (playerName) room.guestName = playerName;
  }

  clientToRoom.set(ws, { roomCode, playerId });

  ws.send(JSON.stringify({ type: "joined", roomCode, isHost }));

  if (room.hostWs && room.guestWs) {
    broadcastToRoom(roomCode, { type: "room_ready", powerUpsEnabled: room.powerUpsEnabled, guestName: room.guestName, hostName: room.hostName });
  }
}

function handleStartCountdown(roomCode: string, circuitId?: string, driverId?: string, weather?: string, powerUpsEnabled?: boolean, questions?: any[], raceLength?: number, clientAeroZones?: number[]) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.status = "countdown";
  if (raceLength !== undefined) {
    room.raceLength = raceLength;
  }
  room.hostProgress = 0;
  room.guestProgress = 0;
  room.hostMistakes = 0;
  room.guestMistakes = 0;
  room.hostFinished = false;
  room.guestFinished = false;
  room.hostFinishTime = null;
  room.guestFinishTime = null;

  // Reset power-ups state
  if (powerUpsEnabled !== undefined) {
    room.powerUpsEnabled = powerUpsEnabled;
  }
  room.hostOvertakeEnergy = 0;
  room.guestOvertakeEnergy = 0;
  room.hostAeroUsedZones = new Set();
  room.guestAeroUsedZones = new Set();
  room.hostOvertakeActive = false;
  room.guestOvertakeActive = false;
  room.hostOvertakeStartTime = null;
  room.guestOvertakeStartTime = null;
  room.hostOvertakeDuration = 0;
  room.guestOvertakeDuration = 0;
  room.hostSectorColors = [];
  room.guestSectorColors = [];
  room.sectorBestTimes = [];

  // Use client-sent AERO zones (respects sim mode), fallback to default 2 zones
  if (room.powerUpsEnabled) {
    if (clientAeroZones && Array.isArray(clientAeroZones) && clientAeroZones.length > 0) {
      room.aeroZones = clientAeroZones.map(z => Math.floor(Number(z))).filter(z => z >= 0 && z < room.raceLength);
    } else {
      room.aeroZones = [
        Math.floor(room.raceLength * 0.25),
        Math.floor(room.raceLength * 0.65)
      ];
    }
  } else {
    room.aeroZones = [];
  }

  // Broadcast countdown start with circuit info so guest can update their selection
  broadcastToRoom(roomCode, {
    type: "countdown_start",
    circuitId,
    driverId,
    weather,
    powerUpsEnabled: room.powerUpsEnabled,
    aeroZones: room.aeroZones,
    questions
  });

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

function handleProgressUpdate(ws: WebSocket, message: { roomCode: string; progress: number; mistakes: number; aeroBonus?: boolean; overtakeBonus?: boolean; sectorColor?: string; responseTime?: number }) {
  const room = rooms.get(message.roomCode);
  if (!room || room.status !== "racing") return;

  const clientInfo = clientToRoom.get(ws);
  if (!clientInfo) return;

  const isHost = clientInfo.playerId === room.hostId;

  // Calculate expected progress increment (1 normally, 2 with AERO or OVERTAKE bonus)
  const hasDoubleBonus = message.aeroBonus || message.overtakeBonus;
  const expectedIncrement = hasDoubleBonus ? 2 : 1;

  // Track previous progress for sector best time calculation
  const previousProgress = isHost ? room.hostProgress : room.guestProgress;

  // Validate progress is sequential (can only increment by 1 or 2 with bonus)
  if (isHost) {
    const expectedProgress = room.hostProgress + expectedIncrement;
    if (message.progress !== expectedProgress) return; // Reject out-of-order updates
    room.hostProgress = message.progress;
    room.hostMistakes = message.mistakes;
    // Store sector color(s) - push twice for bonus (2-sector jump)
    if (message.sectorColor) {
      room.hostSectorColors.push(message.sectorColor);
      if (hasDoubleBonus) {
        room.hostSectorColors.push(message.sectorColor);
      }
    }
  } else {
    const expectedProgress = room.guestProgress + expectedIncrement;
    if (message.progress !== expectedProgress) return; // Reject out-of-order updates
    room.guestProgress = message.progress;
    room.guestMistakes = message.mistakes;
    // Store sector color(s) - push twice for bonus (2-sector jump)
    if (message.sectorColor) {
      room.guestSectorColors.push(message.sectorColor);
      if (hasDoubleBonus) {
        room.guestSectorColors.push(message.sectorColor);
      }
    }
  }

  // Update per-sector best times (only for correct answers with responseTime)
  if (message.responseTime !== undefined && message.sectorColor !== 'red') {
    const newProgress = message.progress;
    for (let s = previousProgress; s < newProgress; s++) {
      const currentBest = room.sectorBestTimes[s];
      if (!currentBest || message.responseTime < currentBest.bestTime) {
        room.sectorBestTimes[s] = { bestTime: message.responseTime, holder: isHost ? 'host' : 'guest' };
      }
    }
  }

  broadcastToRoom(message.roomCode, {
    type: "opponent_progress",
    hostProgress: room.hostProgress,
    guestProgress: room.guestProgress,
    hostMistakes: room.hostMistakes,
    guestMistakes: room.guestMistakes,
    hostSectorColors: room.hostSectorColors,
    guestSectorColors: room.guestSectorColors,
    sectorBestTimes: room.sectorBestTimes
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
    guestMistakes: room.guestMistakes,
    hostSectorColors: room.hostSectorColors,
    guestSectorColors: room.guestSectorColors
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

// Power-ups handlers
function handleTogglePowerUps(ws: WebSocket, message: { roomCode: string; enabled: boolean }) {
  const room = rooms.get(message.roomCode);
  if (!room || room.status !== "waiting") return;

  const clientInfo = clientToRoom.get(ws);
  if (!clientInfo) return;

  // Only host can toggle power-ups
  if (clientInfo.playerId !== room.hostId) return;

  room.powerUpsEnabled = message.enabled;
  broadcastToRoom(message.roomCode, {
    type: "power_ups_toggled",
    enabled: message.enabled
  });
}

function handleEnergyUpdate(ws: WebSocket, message: { roomCode: string; energy: number }) {
  const room = rooms.get(message.roomCode);
  if (!room || room.status !== "racing" || !room.powerUpsEnabled) return;

  const clientInfo = clientToRoom.get(ws);
  if (!clientInfo) return;

  const isHost = clientInfo.playerId === room.hostId;
  const newEnergy = Math.max(0, Math.min(100, message.energy));

  if (isHost) {
    room.hostOvertakeEnergy = newEnergy;
  } else {
    room.guestOvertakeEnergy = newEnergy;
  }

  // Broadcast energy update to opponent
  broadcastToRoom(message.roomCode, {
    type: "energy_sync",
    hostEnergy: room.hostOvertakeEnergy,
    guestEnergy: room.guestOvertakeEnergy
  });
}

function handleActivateOvertake(ws: WebSocket, message: { roomCode: string }) {
  const room = rooms.get(message.roomCode);
  if (!room || room.status !== "racing" || !room.powerUpsEnabled) return;

  const clientInfo = clientToRoom.get(ws);
  if (!clientInfo) return;

  const isHost = clientInfo.playerId === room.hostId;
  const playerEnergy = isHost ? room.hostOvertakeEnergy : room.guestOvertakeEnergy;
  const playerProgress = isHost ? room.hostProgress : room.guestProgress;
  const opponentProgress = isHost ? room.guestProgress : room.hostProgress;

  // Validate activation conditions
  if (playerEnergy <= 0) return;

  // Must be behind (fewer or equal sectors) AND within 2 sectors
  const behindOrEqual = playerProgress <= opponentProgress;
  const withinRange = Math.abs(opponentProgress - playerProgress) <= 2;
  if (!behindOrEqual || !withinRange) return;

  // Calculate boost duration: (energy / 100) * 5000ms
  const boostDuration = Math.round((playerEnergy / 100) * 5000);

  // Mark overtake as active and record start time
  // Energy will drain over time on client - server stores initial energy for validation
  if (isHost) {
    room.hostOvertakeActive = true;
    room.hostOvertakeStartTime = Date.now();
    room.hostOvertakeDuration = boostDuration;
  } else {
    room.guestOvertakeActive = true;
    room.guestOvertakeStartTime = Date.now();
    room.guestOvertakeDuration = boostDuration;
  }

  // Notify the activator they successfully activated
  ws.send(JSON.stringify({
    type: "overtake_activated",
    duration: boostDuration,
    energy: playerEnergy
  }));

  // Notify opponent that player activated overtake (no freeze, just info)
  const opponentWs = isHost ? room.guestWs : room.hostWs;
  if (opponentWs?.readyState === WebSocket.OPEN) {
    opponentWs.send(JSON.stringify({
      type: "opponent_overtake_activated",
      player: isHost ? "host" : "guest"
    }));
  }
}

function handleDeactivateOvertake(ws: WebSocket, message: { roomCode: string; reason: "manual" | "wrong_answer" | "timeout"; remainingEnergy?: number }) {
  const room = rooms.get(message.roomCode);
  if (!room || room.status !== "racing" || !room.powerUpsEnabled) return;

  const clientInfo = clientToRoom.get(ws);
  if (!clientInfo) return;

  const isHost = clientInfo.playerId === room.hostId;

  // Check if this player has an active overtake
  const hasActiveOvertake = isHost ? room.hostOvertakeActive : room.guestOvertakeActive;
  if (!hasActiveOvertake) return;

  const reason = message.reason || "manual";

  // Deactivate overtake
  if (isHost) {
    room.hostOvertakeActive = false;
    room.hostOvertakeStartTime = null;
    room.hostOvertakeDuration = 0;
    // On wrong answer: deplete all energy. On manual: preserve remaining energy. On timeout: energy is 0.
    if (reason === "wrong_answer") {
      room.hostOvertakeEnergy = 0;
    } else if (reason === "manual" && message.remainingEnergy !== undefined) {
      room.hostOvertakeEnergy = message.remainingEnergy;
    } else {
      room.hostOvertakeEnergy = 0;
    }
  } else {
    room.guestOvertakeActive = false;
    room.guestOvertakeStartTime = null;
    room.guestOvertakeDuration = 0;
    if (reason === "wrong_answer") {
      room.guestOvertakeEnergy = 0;
    } else if (reason === "manual" && message.remainingEnergy !== undefined) {
      room.guestOvertakeEnergy = message.remainingEnergy;
    } else {
      room.guestOvertakeEnergy = 0;
    }
  }

  // Notify both players
  broadcastToRoom(message.roomCode, {
    type: "overtake_ended",
    player: isHost ? "host" : "guest",
    reason,
    remainingEnergy: isHost ? room.hostOvertakeEnergy : room.guestOvertakeEnergy
  });
}

function handleActivateAero(ws: WebSocket, message: { roomCode: string; zone: number }) {
  const room = rooms.get(message.roomCode);
  if (!room || room.status !== "racing" || !room.powerUpsEnabled) return;

  const clientInfo = clientToRoom.get(ws);
  if (!clientInfo) return;

  const isHost = clientInfo.playerId === room.hostId;

  // Validate zone exists
  if (!room.aeroZones.includes(message.zone)) return;

  // Check if zone already used by this player
  const usedZones = isHost ? room.hostAeroUsedZones : room.guestAeroUsedZones;
  if (usedZones.has(message.zone)) return;

  // Mark zone as used
  usedZones.add(message.zone);

  // Confirm activation to player
  ws.send(JSON.stringify({
    type: "aero_activated",
    zone: message.zone
  }));
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
    hostName: "",
    guestName: null,
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
    status: "waiting",
    // Power-ups initialization
    powerUpsEnabled: false,
    aeroZones: [],
    hostOvertakeEnergy: 0,
    guestOvertakeEnergy: 0,
    hostAeroUsedZones: new Set(),
    guestAeroUsedZones: new Set(),
    hostOvertakeActive: false,
    guestOvertakeActive: false,
    hostOvertakeStartTime: null,
    guestOvertakeStartTime: null,
    hostOvertakeDuration: 0,
    guestOvertakeDuration: 0,
    hostSectorColors: [],
    guestSectorColors: [],
    sectorBestTimes: [],
  });
}

export function getRoomStatus(roomCode: string): GameRoom | undefined {
  return rooms.get(roomCode);
}
