"use client";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { download } from "@/lib/project/project";
export function CodeEditorPanel() {
  const code = useSimulatorStore((s) => s.code);
  const setCode = useSimulatorStore((s) => s.setCode);
  return (
    <section className="code-panel">
      <div className="panel-heading">
        <strong>sketch.ino</strong>
        <div className="flex gap-2">
          <label className="small-button">
            Buka .ino
            <input
              hidden
              type="file"
              accept=".ino,.txt"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f && f.size <= 64000) setCode(await f.text());
                e.target.value = "";
              }}
            />
          </label>
          <button
            className="small-button"
            onClick={() => download("sketch.ino", code)}
          >
            Unduh
          </button>
        </div>
      </div>
      <textarea
        aria-label="Editor sketch Arduino"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        maxLength={64000}
        className="sketch-editor"
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const t = e.currentTarget;
            const i = t.selectionStart;
            setCode(code.slice(0, i) + "  " + code.slice(t.selectionEnd));
            requestAnimationFrame(() => {
              t.selectionStart = t.selectionEnd = i + 2;
            });
          }
        }}
      />
      <p className="panel-note">
        Subset .ino: setup/loop, variabel, if/for/while, fungsi, digital/analog,
        delay, millis, Serial. Library, array dan C++ penuh belum didukung.
      </p>
    </section>
  );
}
