// prisma/seed.ts
import { PrismaClient, Role, AgentType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("teste01@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@example.com",
      passwordHash,
      role: Role.ADMIN, // ou 'ADMIN'
    },
  });

  console.log("✅ Usuário seed criado: admin@example.com / teste01@123");

  // --------- Agents ---------
  await prisma.agent.upsert({
    where: { id: "agent-secretaria" },
    update: {},
    create: {
      id: "agent-secretaria",
      nome: "Anne",
      tipo: AgentType.SECRETARIA,
      persona: "Agente de secretária que gerencia documentos e matrículas",
      ownerId: admin.id,
      tags: { create: [{ tag: "matricula" }] },
    },
  });

  await prisma.agent.upsert({
    where: { id: "agent-sdr" },
    update: {},
    create: {
      id: "agent-sdr",
      nome: "SOFIA",
      tipo: AgentType.SDR,
      persona: "Agente SDR focada em prospecção de leads",
      ownerId: admin.id,
      tags: { create: [{ tag: "getWeather" }] },
    },
  });

  await prisma.agent.upsert({
    where: { id: "agent-financeiro" },
    update: {},
    create: {
      id: "agent-financeiro",
      nome: "BILL",
      tipo: AgentType.FINANCEIRO,
      persona: "Agente financeiro responsável por contas e recebíveis",
      ownerId: admin.id,
      tags: { create: [{ tag: "getWeather" }] },
    },
  });

  console.log("✅ Agentes seed criados: SECRETARIA, SDR, FINANCEIRO");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
