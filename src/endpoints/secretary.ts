import { CustomEndpointDefinition } from "@voltagent/core";
import { SDRChat } from "../agents/sdr";
import { SecretaryChat } from "../agents/secretary";

export const secretaryEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/api/secretary/chat",
    method: "post" as const,
    handler: async (c: any) => {
      const body = await c.req.json();
      const { input, userId, conversationId } = body;


      try {
    
       const response =  await SecretaryChat(input, userId, conversationId)
        return c.json(
          {
            success: true,
            message: "message successfull",
            data: response,
          },
          201
        );
      } catch (error: any) {
        return c.json(
          {
            success: false,
            message: error.message || "Invalid request body",
            data: null,
          },
          400
        );
      }
    },
    description: "[publica] chat com secretária",
  },
]

