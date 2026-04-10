import { db } from "../../db";
import { aiConversations, aiMessages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof aiConversations.$inferSelect | undefined>;
  getAllConversations(): Promise<(typeof aiConversations.$inferSelect)[]>;
  createConversation(title: string): Promise<typeof aiConversations.$inferSelect>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof aiMessages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<typeof aiMessages.$inferSelect>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db.select().from(aiConversations).orderBy(desc(aiConversations.createdAt));
  },

  async createConversation(title: string) {
    const [conversation] = await db.insert(aiConversations).values({ title }).returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, id));
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId)).orderBy(aiMessages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const [message] = await db.insert(aiMessages).values({ conversationId, role, content }).returning();
    return message;
  },
};
