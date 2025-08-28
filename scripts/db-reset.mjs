import { execSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";

function sh(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function docker(cmd) {
  try {
    sh(`docker compose ${cmd}`);
  } catch (e) {
    // Fallback para ambientes com docker-compose legado
    sh(`docker-compose ${cmd}`);
  }
}

try {
  docker("down --remove-orphans");
} catch (e) {
  // ignora
}

if (existsSync("./postgres_data")) {
  console.log("Removing ./postgres_data volume directory...");
  rmSync("./postgres_data", { recursive: true, force: true });
}

docker("up -d postgres");

console.log("Postgres reset complete. MEMORY_DATABASE_URL should point to 127.0.0.1:5435.");
