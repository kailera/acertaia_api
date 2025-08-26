import { CustomEndpointDefinition } from "@voltagent/core";
import { loginUser } from "../services/login";
import { createInstance } from "../services/users";

export const userEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/api/login",
    method: "post" as const,
    handler: async (c: any) => {
      const body = await c.req.json();
      const { email, password } = body;

      try {
        const user = await loginUser(email, password);

        console.log(`user encontrado: ${user}`);
        return c.json(
          {
            success: true,
            message: "Login successful",
            data: user,
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
  },

  {
    path: "/api/instance",
    method: "post" as const,
    handler: async (c: any) => {
      const body = await c.req.json();
      const { instance, userId } = body;

      try {
        const createdInstance = await createInstance(instance, userId);

        console.log(`user encontrado: ${instance}`);
        return c.json(
          {
            success: true,
            message: "instance created successful",
            data: createdInstance,
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
    description: "[publica] cria uma instancia no banco",
  },
];
