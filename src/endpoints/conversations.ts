import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { memoryStorage } from "../utils/memory";

function toInt(v: string | undefined, def: number): number {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
}

export const conversationEndpoints: CustomEndpointDefinition[] = [
  // List user conversations (with optional resourceId filter)
  {
    path: "/api/conversations",
    method: "get" as const,
    handler: async (c: Context): Promise<Response> => {
      const userId = c.req.header("x-user-id");
      if (!userId)
        return c.json({ success: false, message: "missing userId" }, 401);

      const limit = toInt(c.req.query("limit"), 50);
      const offset = toInt(c.req.query("offset"), 0);
      const orderBy = (c.req.query("orderBy") || "updated_at") as
        | "created_at"
        | "updated_at"
        | "title";
      const orderDirection = (c.req.query("orderDirection") || "DESC") as
        | "ASC"
        | "DESC";
      const resourceId = c.req.query("resourceId") || undefined;

      const conversations = await memoryStorage.queryConversations({
        userId,
        resourceId,
        limit,
        offset,
        orderBy,
        orderDirection,
      });

      return c.json({ success: true, data: conversations });
    },
    description: "[privada] lista conversas do usuário (filtro opcional por resourceId)",
  },

  // Get messages for a conversation
  {
    path: "/api/conversations/:conversationId/messages",
    method: "get" as const,
    handler: async (c: Context): Promise<Response> => {
      const userId = c.req.header("x-user-id");
      if (!userId)
        return c.json({ success: false, message: "missing userId" }, 401);

      const conversationId = c.req.param("conversationId");
      const limit = toInt(c.req.query("limit"), 100);
      const offset = toInt(c.req.query("offset"), 0);

      // Optionally you could verify ownership of the conversation here if provider exposes it.
      const messages = await memoryStorage.getConversationMessages(
        conversationId,
        { limit, offset },
      );

      return c.json({ success: true, data: messages });
    },
    description: "[privada] lista mensagens de uma conversa",
  },
];

