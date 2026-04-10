import type { Express, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";
import { config } from "../../config";
import { logStructured } from "../../logger";

const openai = config.ai.enabled
  ? new OpenAI({
      apiKey: config.ai.apiKey,
      baseURL: config.ai.baseUrl,
    })
  : null;

const SYSTEM_PROMPT = `You are AirManager AI, a property management assistant for short-term rental businesses. You help property managers with:

- Booking management and guest communications
- Revenue optimization and pricing strategies
- Property maintenance and housekeeping coordination
- Local area recommendations for guests
- Occupancy rate analysis and seasonal trends
- Guest experience improvement suggestions

Always be professional, concise, and helpful. Use $ (USD) for all monetary references. Keep responses focused and actionable.`;

const SSE_MAX_DURATION_MS = 120_000;

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logStructured("error", {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        error: err.message,
        context: "ai-chat",
      });
      next(err);
    });
  };
}

export function registerChatRoutes(app: Express): void {
  app.get("/api/ai-chat/conversations", asyncHandler(async (_req: Request, res: Response) => {
    const conversations = await chatStorage.getAllConversations();
    res.json(conversations);
  }));

  app.get("/api/ai-chat/conversations/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const conversation = await chatStorage.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const messages = await chatStorage.getMessagesByConversation(id);
    res.json({ ...conversation, messages });
  }));

  app.post("/api/ai-chat/conversations", asyncHandler(async (req: Request, res: Response) => {
    const { title } = req.body;
    const conversation = await chatStorage.createConversation(title || "New Chat");
    res.status(201).json(conversation);
  }));

  app.delete("/api/ai-chat/conversations/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    await chatStorage.deleteConversation(id);
    res.status(204).send();
  }));

  app.post("/api/ai-chat/conversations/:id/messages", asyncHandler(async (req: Request, res: Response) => {
    if (!openai) {
      return res.status(503).json({ error: "AI features are not configured. Set AI_INTEGRATIONS_OPENAI_API_KEY to enable this feature." });
    }

    const conversationId = parseInt(req.params.id as string);
    const { content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const conversation = await chatStorage.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    await chatStorage.createMessage(conversationId, "user", content.trim());

    const messages = await chatStorage.getMessagesByConversation(conversationId);
    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sseTimeout = setTimeout(() => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: "SSE stream exceeded maximum duration" })}\n\n`);
        res.end();
      }
    }, SSE_MAX_DURATION_MS);

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        if (res.writableEnded) break;
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      clearTimeout(sseTimeout);
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      clearTimeout(sseTimeout);
      logStructured("error", {
        correlationId: req.correlationId,
        error: error.message,
        context: "ai-chat-stream",
      });
      if (!res.writableEnded) {
        if (res.headersSent) {
          res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
          res.end();
        } else {
          res.status(500).json({ error: "Failed to send message" });
        }
      }
    }
  }));
}
