import { type User, type InsertUser, type MultiplayerRoom, type InsertRoom, multiplayerRooms } from "@shared/schema";
import { db, withRetry } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createRoom(room: InsertRoom): Promise<MultiplayerRoom>;
  getRoomByCode(code: string): Promise<MultiplayerRoom | undefined>;
  updateRoom(roomCode: string, updates: Partial<MultiplayerRoom>): Promise<MultiplayerRoom | undefined>;
  deleteRoom(roomCode: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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

export const storage = new DatabaseStorage();
