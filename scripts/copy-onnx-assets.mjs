import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.dirname(require.resolve("onnxruntime-web/wasm"));
const packageRoot = path.dirname(dist);
const packageInfo = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
const versionSource = await readFile(path.join(root, "src", "lib", "ai", "onnxVersion.ts"), "utf8");
if (!versionSource.includes(`"${packageInfo.version}"`)) {
  throw new Error(`ONNX Runtime Web ${packageInfo.version} does not match the pinned runtime version.`);
}

const destination = path.join(root, "public", "onnxruntime");
const runtimeFiles = [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
];
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await Promise.all(runtimeFiles.map((file) => cp(path.join(dist, file), path.join(destination, file))));
console.log(`Copied ONNX Runtime Web ${packageInfo.version} WASM assets to public/onnxruntime.`);
