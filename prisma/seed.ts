import { PrismaClient, Channel } from "@prisma/client";

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
}

main()
        .then(async () => {
                await prisma.$disconnect();
        })
        .catch(async (e) => {
                console.error(e);
                await prisma.$disconnect();
                process.exit(1);
        });

