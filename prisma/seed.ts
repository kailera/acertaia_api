import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
