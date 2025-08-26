import { prisma } from "../utils/prisma";

export async function createInstance(instance: string, userId: string) {
    // a instancia nao existe
  
    const newInstance = await prisma.whatsappNumbers.create({
        data:{
            userId, 
            instance
        }
    })
    return newInstance
}
