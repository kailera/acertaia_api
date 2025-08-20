import { build } from "esbuild";
import fs from "fs";


const nodeModules = fs.readdirSync('node_modules').filter(d=> d !=='.bin')
build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20", // ou node18, depende do ambiente
  outfile: "dist/index.js",
  sourcemap: true,
  external: [                      // não empacota dependências do node_modules
    ...nodeModules,
    './prisma/client'
  ],
  format:"esm"
}).catch(() => process.exit(1));
