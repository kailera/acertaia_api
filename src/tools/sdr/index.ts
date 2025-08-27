import { createTool } from "@voltagent/core";
import { z } from "zod";

export const sdrLeadTool = createTool({
  name: "qualifyLead",
  description: "Ferramenta de exemplo para qualificação de leads",
  parameters: z.object({
    leadName: z.string().describe("nome do lead"),
  }),
  execute: async ({ leadName }) => {
    return { result: `Lead ${leadName} qualificado` };
  },
});
