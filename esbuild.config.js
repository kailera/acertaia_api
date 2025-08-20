import { build } from "esbuild";

build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20", // ou node18, depende do ambiente
  outfile: "dist/index.js",
  sourcemap: true,
  external: [                      // não empacota dependências do node_modules
    "dotenv",
    "@voltagent/core",
    "@voltagent/logger",
    "@voltagent/vercel-ai",
    "@ai-sdk/openai",
    "@prisma/client",
    ".prisma/client"
  ],
  format:"esm"
}).catch(() => process.exit(1));
