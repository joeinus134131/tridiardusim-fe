import { cp, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pyodideDir = path.dirname(require.resolve("pyodide/package.json"));
const pyodidePackage = require("pyodide/package.json");
const destination = path.join(root, "public", "pyodide");
const runtimeFiles = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];
const versionSource = await readFile(path.join(root, "src", "lib", "simulation", "pyodideVersion.ts"), "utf8");
if (!versionSource.includes(`"${pyodidePackage.version}"`)) {
  throw new Error(`Pyodide package ${pyodidePackage.version} does not match the runtime version constant.`);
}

await mkdir(destination, { recursive: true });
await Promise.all(runtimeFiles.map((file) => cp(path.join(pyodideDir, file), path.join(destination, file))));
console.log(`Copied Pyodide ${pyodidePackage.version} runtime assets to public/pyodide.`);
