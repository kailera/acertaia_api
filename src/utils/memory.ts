import { PostgresStorage } from "@voltagent/postgres";

const connection = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;

if (!connection) {
	throw new Error(
		"MEMORY_DATABASE_URL is required. Please provide the MEMORY_DATABASE_URL environment variable.",
	);
}

const storageLimit = Number(process.env.MEMORY_STORAGE_LIMIT || 100);

export const memoryStorage = new PostgresStorage({
	connection,
	maxConnections: 10,
	tablePrefix: "voltagent_memory",
	storageLimit,
});
