import { PrismaClient, AgentType, Channel, Role, CampaignStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
        const tenant = await prisma.tenant.upsert({
                where: { id: "default-tenant" },
                update: { slug: "default" },
                create: { id: "default-tenant", name: "Default Tenant", slug: "default" },
        });

        // Seed: demo user with password
        const demoEmail = "demo@acertaia.local";
        const demoPassword = "demo123"; // change in production
        const demoHash = await hash(demoPassword, 10);

        const demoUser = await prisma.user.upsert({
                where: { email: demoEmail },
                update: {
                        passwordHash: demoHash,
                        role: Role.ADMIN,
                        name: "Demo User",
                        tenantId: tenant.id,
                },
                create: {
                        name: "Demo User",
                        email: demoEmail,
                        passwordHash: demoHash,
                        role: Role.ADMIN,
                        tenantId: tenant.id,
                },
        });

        // Additional users for the User table
        const users = [
                { name: "Admin", email: "admin@acertaia.local", role: Role.ADMIN },
                { name: "Supervisor", email: "supervisor@acertaia.local", role: Role.SUPERVISOR },
                { name: "Secretaria", email: "secretaria@acertaia.local", role: Role.SECRETARIA },
                { name: "Financeiro", email: "financeiro@acertaia.local", role: Role.FINANCEIRO },
                { name: "SDR", email: "sdr@acertaia.local", role: Role.SDR },
                { name: "Logistica", email: "logistica@acertaia.local", role: Role.LOGISTICA },
                { name: "Seller", email: "seller@acertaia.local", role: Role.SELLER },
                { name: "User", email: "user@acertaia.local", role: Role.USER },
        ] as const;

        for (const u of users) {
                await prisma.user.upsert({
                        where: { email: u.email },
                        update: {
                                name: u.name,
                                role: u.role,
                                passwordHash: demoHash,
                                tenantId: tenant.id,
                        },
                        create: {
                                name: u.name,
                                email: u.email,
                                role: u.role,
                                passwordHash: demoHash,
                                tenantId: tenant.id,
                        },
                });
        }

        await prisma.campaign.upsert({
                where: { id: "DEFAULT" },
                update: {},
                create: {
                        id: "DEFAULT",
                        name: "DEFAULT",
                        channel: Channel.WEB,
                        startDate: new Date(),
                        status: CampaignStatus.ACTIVE,
                        tenantId: tenant.id,
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
                update: { passwordHash: demoHash, tenantId: tenant.id },
                create: {
                        name: "Template Owner",
                        email: "template@system.local",
                        passwordHash: demoHash,
                        role: Role.ADMIN,
                        tenantId: tenant.id,
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

        console.log("Seed completed. Demo credentials (all seeded users share password):");
        console.log(`  default password: ${demoPassword}`);
        console.log("  users:");
        console.log(`   - ${demoEmail}`);
        for (const u of users) console.log(`   - ${u.email}`);
}

main()
        .catch((e) => {
                console.error(e);
                process.exit(1);
        })
        .finally(async () => {
                await prisma.$disconnect();
        });
