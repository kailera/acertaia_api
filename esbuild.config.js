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
    "@pinecone-database/*",
    "*",
    ".prisma/client",       // não bundle o client gerado
    "stream",               // Node nativo
    "fs",                   // Node nativo
    "path",                 // Node nativo
    "os",                   // Node nativo
    "crypto"
  ],
  format:"esm"
}).catch(() => process.exit(1));
