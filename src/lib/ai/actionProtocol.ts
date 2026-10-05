import type { CircuitComponent } from "../components/componentTypes";
import { aeroArm6Dof, eduArm3Dof, type RobotModel } from "../robotics/robots";

export interface ValidatedJointTarget {
  robotId: string;
  jointIndex: number;
  targetRad: number;
}

export interface ValidatedActionChunk {
  type: "action_chunk";
  sequence: number;
  validForMs: number;
  joints: ValidatedJointTarget[];
}

export function robotModelForComponent(component: CircuitComponent): RobotModel | null {
  if (component.typeId === "edu_arm_3dof") return eduArm3Dof;
  if (component.typeId === "aero_arm_6dof") return aeroArm6Dof;
  return null;
}

/** Decode a bounded, versioned-by-type action payload and clamp targets to robot joint limits. */
export function validateActionChunk(
  payload: string,
  robots: readonly CircuitComponent[],
  allowedRobotId: string,
): ValidatedActionChunk {
  if (payload.length > 16_384) throw new Error("Action chunk melebihi batas 16 KB.");
  let data: unknown;
  try { data = JSON.parse(payload); } catch { throw new Error("Balasan gateway bukan JSON yang valid."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Format action chunk tidak valid.");

  const message = data as Record<string, unknown>;
  if (message.type !== "action_chunk") throw new Error("Tipe pesan gateway tidak dikenal.");
  if (!Number.isSafeInteger(message.sequence) || Number(message.sequence) < 0) throw new Error("Sequence action chunk tidak valid.");
  if (typeof message.validForMs !== "number" || !Number.isFinite(message.validForMs)) throw new Error("Durasi action chunk tidak valid.");
  if (!Array.isArray(message.joints) || message.joints.length === 0 || message.joints.length > 12) throw new Error("Action chunk harus memuat 1–12 target joint.");

  const robot = robots.find((item) => item.id === allowedRobotId);
  const model = robot ? robotModelForComponent(robot) : null;
  if (!robot || !model) throw new Error("Robot target sudah tidak tersedia.");

  const seen = new Set<number>();
  const joints: ValidatedJointTarget[] = [];
  for (const raw of message.joints) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const target = raw as Record<string, unknown>;
    if (target.robotId !== allowedRobotId || !Number.isInteger(target.jointIndex) || typeof target.targetRad !== "number" || !Number.isFinite(target.targetRad)) continue;
    const jointIndex = Number(target.jointIndex);
    if (jointIndex < 0 || jointIndex >= model.joints.length || seen.has(jointIndex)) continue;
    seen.add(jointIndex);
    const joint = model.joints[jointIndex];
    joints.push({ robotId: allowedRobotId, jointIndex, targetRad: Math.max(joint.min, Math.min(joint.max, target.targetRad)) });
  }
  if (joints.length === 0) throw new Error("Action chunk tidak berisi joint target yang valid untuk robot terpilih.");

  return {
    type: "action_chunk",
    sequence: Number(message.sequence),
    validForMs: Math.max(50, Math.min(2_000, Math.trunc(message.validForMs))),
    joints,
  };
}

export function validateGatewayUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Masukkan URL WebSocket gateway yang valid."); }
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "wss:" && !(url.protocol === "ws:" && isLocal)) {
    throw new Error("Gateway remote harus memakai wss://. ws:// hanya diizinkan untuk localhost.");
  }
  if (url.username || url.password || url.hash) throw new Error("URL gateway tidak boleh memuat kredensial atau fragment.");
  return url.href;
}
