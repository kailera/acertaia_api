import { prisma } from "../utils/prisma";

export interface CreateLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  campaignId?: string;
  tenantId: string;
}

export async function createLead({
  firstName,
  lastName,
  email,
  phone,
  campaignId = "DEFAULT",
  tenantId,
}: CreateLeadInput) {
  return prisma.lead.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      campaignId,
      tenantId,
    },
  });
}

