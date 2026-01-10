import { type User, type InsertUser, type MultiplayerRoom, type InsertRoom, multiplayerRooms } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, withRetry } from "./db";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createRoom(room: InsertRoom): Promise<MultiplayerRoom>;
  getRoomByCode(code: string): Promise<MultiplayerRoom | undefined>;
  updateRoom(roomCode: string, updates: Partial<MultiplayerRoom>): Promise<MultiplayerRoom | undefined>;
  deleteRoom(roomCode: string): Promise<void>;
  getStorageType(): string;
}

// In-memory storage for LAN play (no database required)
export class MemoryStorage implements IStorage {
  private rooms = new Map<string, MultiplayerRoom>();
  private users = new Map<string, User>();

  getStorageType(): string {
    return "memory";
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createRoom(room: InsertRoom): Promise<MultiplayerRoom> {
    const newRoom: MultiplayerRoom = {
      id: randomUUID(),
      roomCode: room.roomCode,
      hostId: room.hostId,
      hostName: room.hostName,
      guestId: null,
      guestName: null,
      circuitId: room.circuitId,
      driverId: room.driverId,
      status: "waiting",
      questions: null,
      hostProgress: 0,
      guestProgress: 0,
      hostMistakes: 0,
      guestMistakes: 0,
      hostFinishTime: null,
      guestFinishTime: null,
      winnerId: null,
      createdAt: new Date(),
    };
    this.rooms.set(room.roomCode, newRoom);
    return newRoom;
  }

  async getRoomByCode(code: string): Promise<MultiplayerRoom | undefined> {
    return this.rooms.get(code);
  }

  async updateRoom(roomCode: string, updates: Partial<MultiplayerRoom>): Promise<MultiplayerRoom | undefined> {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    const updated = { ...room, ...updates };
    this.rooms.set(roomCode, updated);
    return updated;
  }

  async deleteRoom(roomCode: string): Promise<void> {
    this.rooms.delete(roomCode);
  }
}

// Database storage for internet play (requires DATABASE_URL)
export class DatabaseStorage implements IStorage {
  getStorageType(): string {
    return "database";
  }

  async getUser(id: string): Promise<User | undefined> {
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    return { ...insertUser, id };
  }

  async createRoom(room: InsertRoom): Promise<MultiplayerRoom> {
    return withRetry(async () => {
      const [newRoom] = await db.insert(multiplayerRooms).values(room).returning();
      return newRoom;
    });
  }

  async getRoomByCode(code: string): Promise<MultiplayerRoom | undefined> {
    return withRetry(async () => {
      const [room] = await db.select().from(multiplayerRooms).where(eq(multiplayerRooms.roomCode, code));
      return room;
    });
  }

  async updateRoom(roomCode: string, updates: Partial<MultiplayerRoom>): Promise<MultiplayerRoom | undefined> {
    return withRetry(async () => {
      const [updated] = await db.update(multiplayerRooms)
        .set(updates)
        .where(eq(multiplayerRooms.roomCode, roomCode))
        .returning();
      return updated;
    });
  }

  async deleteRoom(roomCode: string): Promise<void> {
    return withRetry(async () => {
      await db.delete(multiplayerRooms).where(eq(multiplayerRooms.roomCode, roomCode));
    });
  }
}

// Wrapper that falls back to memory storage when database fails
class FallbackStorage implements IStorage {
  private primaryStorage: DatabaseStorage;
  private fallbackStorage: MemoryStorage;
  private usingFallback = false;

  constructor() {
    this.primaryStorage = new DatabaseStorage();
    this.fallbackStorage = new MemoryStorage();
  }

  getStorageType(): string {
    return this.usingFallback ? "memory (fallback)" : "database";
  }

  private async withFallback<T>(operation: () => Promise<T>, fallbackOperation: () => Promise<T>): Promise<T> {
    if (this.usingFallback) {
      return fallbackOperation();
    }

    try {
      return await operation();
    } catch (error: any) {
      const isConnectionError =
        error.code === 'EAI_AGAIN' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('EAI_AGAIN') ||
        error.message?.includes('getaddrinfo');

      if (isConnectionError) {
        console.log("⚠️ Database unavailable - switching to in-memory storage (LAN mode)");
        this.usingFallback = true;
        return fallbackOperation();
      }
      throw error;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.withFallback(
      () => this.primaryStorage.getUser(id),
      () => this.fallbackStorage.getUser(id)
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.withFallback(
      () => this.primaryStorage.getUserByUsername(username),
      () => this.fallbackStorage.getUserByUsername(username)
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.withFallback(
      () => this.primaryStorage.createUser(user),
      () => this.fallbackStorage.createUser(user)
    );
  }

  async createRoom(room: InsertRoom): Promise<MultiplayerRoom> {
    return this.withFallback(
      () => this.primaryStorage.createRoom(room),
      () => this.fallbackStorage.createRoom(room)
    );
  }

  async getRoomByCode(code: string): Promise<MultiplayerRoom | undefined> {
    return this.withFallback(
      () => this.primaryStorage.getRoomByCode(code),
      () => this.fallbackStorage.getRoomByCode(code)
    );
  }

  async updateRoom(roomCode: string, updates: Partial<MultiplayerRoom>): Promise<MultiplayerRoom | undefined> {
    return this.withFallback(
      () => this.primaryStorage.updateRoom(roomCode, updates),
      () => this.fallbackStorage.updateRoom(roomCode, updates)
    );
  }

  async deleteRoom(roomCode: string): Promise<void> {
    return this.withFallback(
      () => this.primaryStorage.deleteRoom(roomCode),
      () => this.fallbackStorage.deleteRoom(roomCode)
    );
  }
}

// Automatically select storage based on DATABASE_URL availability
function createStorage(): IStorage {
  if (!process.env.DATABASE_URL) {
    console.log("📡 No DATABASE_URL found - using in-memory storage (LAN mode)");
    return new MemoryStorage();
  }

  console.log("🌐 DATABASE_URL found - using database storage with fallback");
  return new FallbackStorage();
}

export const storage = createStorage();
