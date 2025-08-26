import { PrismaClient, AgentIaTypes, Role, SubscriptionsPlans } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const businessSubscription = await prisma.businessSubscription.create({
    data: {
      name: 'Default Subscription',
      description: 'Base subscription',
      plan: SubscriptionsPlans.PRO,
    },
  });

  const user = await prisma.user.create({
    data: {
      name: 'Default User',
      email: 'user@example.com',
      passwordHash: 'changeme',
      role: Role.USER,
      businessSubscriptionId: businessSubscription.id,
    },
  });

  const agentTypes: AgentIaTypes[] = [
    AgentIaTypes.SECRETARY,
    AgentIaTypes.FINANCE,
    AgentIaTypes.SDR,
    AgentIaTypes.LOGISTIC,
  ];

  for (const type of agentTypes) {
    await prisma.agentsIa.create({
      data: {
        name: `${type} Agent`,
        type,
        personScript: 'Base person script',
        enableAudio: false,
        userId: user.id,
        businessSubscriptionId: businessSubscription.id,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
