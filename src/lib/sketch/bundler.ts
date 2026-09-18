/**
 * Utility to bundle multiple sketch tabs (.ino, .h, .cpp) into a single
 * execution code string for the simulation runtime.
 */

export function bundleSketchFiles(files: Array<{ name: string; content: string }>): string {
  if (!files || files.length === 0) return "";

  const mainFile = files.find((f) => f.name === "sketch.ino") || files[0];
  let bundled = mainFile ? mainFile.content : "";

  // 1. Resolve local #include "foo.h" or #include <foo.h> with custom file contents
  const headerFiles = files.filter((f) => f.name !== "sketch.ino" && f.name.endsWith(".h"));
  for (const h of headerFiles) {
    const escName = h.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const includePattern = new RegExp(`^[ \\t]*#include[ \\t]+["<]${escName}[">].*$`, "gm");

    if (includePattern.test(bundled)) {
      bundled = bundled.replace(
        includePattern,
        `\n// --- BEGIN ${h.name} ---\n${h.content}\n// --- END ${h.name} ---\n`
      );
    } else {
      // If user created a .h file without an explicit #include in main sketch, auto-prepend it
      bundled = `// --- Auto-included ${h.name} ---\n${h.content}\n\n` + bundled;
    }
  }

  // 2. Append any additional implementation files (.cpp, .c)
  const cppFiles = files.filter(
    (f) => f.name !== "sketch.ino" && (f.name.endsWith(".cpp") || f.name.endsWith(".c"))
  );
  for (const cpp of cppFiles) {
    bundled += `\n\n// --- Implementation ${cpp.name} ---\n${cpp.content}\n`;
  }

  return bundled;
}
