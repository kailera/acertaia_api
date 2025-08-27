import { PrismaClient, AgentType, Channel, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
        await prisma.campaign.upsert({
                where: { id: "DEFAULT" },
                update: {},
                create: {
                        id: "DEFAULT",
                        name: "DEFAULT",
                        channel: Channel.WEB,
                        startDate: new Date(),
                },
        });

        await prisma.sponsor.create({
                data: {
                        firstName: "John",
                        lastName: "Doe",
                        birth: "1980-01-01",
                        isMain: true,
                        email: "john.doe@example.com",
                        phone: "555-0000",
                },
        });

        const owner = await prisma.user.upsert({
                where: { email: "template@system.local" },
                update: {},
                create: {
                        name: "Template Owner",
                        email: "template@system.local",
                        passwordHash: "",
                        role: Role.ADMIN,
                },
        });

        await prisma.agent.upsert({
                where: { id: "template-secretaria" },
                update: {},
                create: {
                        id: "template-secretaria",
                        nome: "Modelo Secretaria",
                        tipo: AgentType.SECRETARIA,
                        persona: "Instruções base da secretária",
                        herdaPersonaDoPai: false,
                        ownerId: owner.id,
                        isTemplate: true,
                },
        });
        await prisma.agent.upsert({
                where: { id: "template-financeiro" },
                update: {},
                create: {
                        id: "template-financeiro",
                        nome: "Modelo Financeiro",
                        tipo: AgentType.FINANCEIRO,
                        persona: "Instruções base do financeiro",
                        herdaPersonaDoPai: false,
                        ownerId: owner.id,
                        isTemplate: true,
                },
        });
        await prisma.agent.upsert({
                where: { id: "template-sdr" },
                update: {},
                create: {
                        id: "template-sdr",
                        nome: "Modelo SDR",
                        tipo: AgentType.SDR,
                        persona: "Instruções base do SDR",
                        herdaPersonaDoPai: false,
                        ownerId: owner.id,
                        isTemplate: true,
                },
        });
        await prisma.agent.upsert({
                where: { id: "template-logistica" },
                update: {},
                create: {
                        id: "template-logistica",
                        nome: "Modelo Logística",
                        tipo: AgentType.LOGISTICA,
                        persona: "Instruções base da logística",
                        herdaPersonaDoPai: false,
                        ownerId: owner.id,
                        isTemplate: true,
                },
        });
}

main()
        .catch((e) => {
                console.error(e);
                process.exit(1);
        })
        .finally(async () => {
                await prisma.$disconnect();
        });
