import { CustomEndpointDefinition } from "@voltagent/core";
import { SDRChat } from "../agents/sdr";

export const srdEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/api/sdr",
    method: "post" as const,
    handler: async (c: any) => {
      const body = await c.req.json();
      const { input, userId, conversationId } = body;


      // pegue os dados do a
      try {
   
       const response =  await SDRChat(input, userId, conversationId)
        return c.json(
          {
            success: true,
            message: "Login successful",
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
    description: "[publica] busca email para login",
  }
]
