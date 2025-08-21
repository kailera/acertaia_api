import { CustomEndpointDefinition } from "@voltagent/core";
import { loginUser } from "../services/login";
import withCORS from "../utils/with-cors";

export const userEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/api/login",
    method: "post" as const,
    handler: withCORS(async (c: any) => {
      const body = await c.req.json();
      const { email, password } = body;

      try {
        const token = await loginUser(email, password);

        return c.json(
          {
            success: true,
            message: "Login successful",
            data: token,
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
    }),
    description: "[publica] busca email para login",
  },
];
