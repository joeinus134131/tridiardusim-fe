# Taste
- Communicates in Indonesian (Bahasa Indonesia), typically casual Jakarta-style (e.g., "lu", "gak") with frequent typos; expects replies in Indonesian. Confidence: 0.85
- Prefers summaries/verdicts that are direct and candid (clear verdict up front, then supporting detail). Confidence: 0.55
- For plan/design reviews, wants expert-level critical analysis with explicitly no implementation ("pure untuk mengkritik plan") — the goal is a rigid, near-realistis plan, not code. Confidence: 0.7
- Expects the assistant to inspect and read the actual files/codebase before opining ("coba cek dulu dan baca"), including cross-referencing documentation against real code and git history. Confidence: 0.65
- Values honest feasibility assessment; wants overclaims called out explicitly and plans trimmed to what is realistic (e.g., milestone cuts/defers), not aspirational scope. Confidence: 0.6
- Working standard of their own (from RENCANA.md, as quoted): results must be recorded and verified with actual tests — no "passing" claims without tests. Confidence: 0.5
- Ongoing project: browser-based Arduino/ESP32 electronics simulation being extended toward 3D robotics (TypeScript frontend, Web Worker circuit solver, docs in Indonesian under docs/). Confidence: 0.6
- After the assistant's review proposes concrete doc fixes, expects the assistant to apply the edits directly to the files ("bisa langsung update gak lu docs nya?") — execute the changes, not merely list them. Confidence: 0.7
- Values keeping project docs (inventory, roadmap, per-doc status) in sync with the actual codebase before starting new feature development; treats doc-code alignment as the foundation for proceeding ("lebih mantap dan sesuai tanpa out of semua nya"). Confidence: 0.55
