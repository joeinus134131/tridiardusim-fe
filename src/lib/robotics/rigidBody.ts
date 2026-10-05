import RAPIER, { type Collider, type ImpulseJoint, type RigidBody, type World } from "@dimforge/rapier3d-compat";
import type { CircuitComponent } from "../components/componentTypes";
import { localBounds } from "../components/placement";

/** The breadboard reference is 84 mm across 16.8 scene units: 5 mm per unit. */
export const SCENE_METERS_PER_UNIT = 0.005;
export const RIGID_BODY_STEP_SECONDS = 0.005;
export type PhysicsMode = "off" | "dynamic" | "fixed";
export type RigidTransform = { position: [number, number, number]; rotation: [number, number, number] };

type BodyRecord = {
  body: RigidBody;
  collider: Collider;
  mode: Exclude<PhysicsMode, "off">;
  shapeKey: string;
};
type JointRecord = { joint: ImpulseJoint; signature: string };

function modeOf(component: CircuitComponent): PhysicsMode {
  const mode = component.state.physicsMode;
  return mode === "dynamic" || mode === "fixed" ? mode : "off";
}

function normalizedMaterial(component: CircuitComponent) {
  const read = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    massKg: Math.max(0.01, Math.min(1000, read(component.state.physicsMassKg, 0.2))),
    friction: Math.max(0, Math.min(2, read(component.state.physicsFriction, 0.7))),
    restitution: Math.max(0, Math.min(1, read(component.state.physicsRestitution, 0))),
  };
}

function quaternionFromEuler([x, y, z]: [number, number, number]) {
  const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3,
  };
}

function eulerFromQuaternion(q: { x: number; y: number; z: number; w: number }): [number, number, number] {
  const sinr = 2 * (q.w * q.x + q.y * q.z);
  const cosr = 1 - 2 * (q.x * q.x + q.y * q.y);
  const sinp = 2 * (q.w * q.y - q.z * q.x);
  const siny = 2 * (q.w * q.z + q.x * q.y);
  const cosy = 1 - 2 * (q.y * q.y + q.z * q.z);
  return [Math.atan2(sinr, cosr), Math.asin(Math.max(-1, Math.min(1, sinp))), Math.atan2(siny, cosy)];
}

function shapeKey(component: CircuitComponent, mode: Exclude<PhysicsMode, "off">) {
  const bounds = localBounds(component);
  const material = normalizedMaterial(component);
  return JSON.stringify([mode, bounds.min, bounds.max, material]);
}

/** Rapier world owned by the dedicated physics worker. State coordinates stay in scene units at the boundary. */
export class RigidBodyWorld {
  private readonly world: World;
  private readonly bodies = new Map<string, BodyRecord>();
  private readonly joints = new Map<string, JointRecord>();
  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = RIGID_BODY_STEP_SECONDS;
    this.world.lengthUnit = 0.05;
    this.world.numSolverIterations = 8;
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.025, 0));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.025, 5).setFriction(0.9), ground);
  }

  static async create() {
    await RAPIER.init();
    return new RigidBodyWorld();
  }

  sync(components: CircuitComponent[]) {
    const active = new Map(components.filter((component) => modeOf(component) !== "off").map((component) => [component.id, component]));
    for (const [id, record] of this.bodies) {
      const component = active.get(id);
      const mode = component ? modeOf(component) : "off";
      if (!component || mode === "off" || shapeKey(component, mode) !== record.shapeKey) {
        this.removeJoint(id);
        this.world.removeRigidBody(record.body);
        this.bodies.delete(id);
      }
    }

    for (const component of active.values()) {
      const mode = modeOf(component) as Exclude<PhysicsMode, "off">;
      const nextShapeKey = shapeKey(component, mode);
      const current = this.bodies.get(component.id);
      if (current) {
        if (mode === "fixed") {
          current.body.setTranslation({
            x: component.position[0] * SCENE_METERS_PER_UNIT,
            y: component.position[1] * SCENE_METERS_PER_UNIT,
            z: component.position[2] * SCENE_METERS_PER_UNIT,
          }, true);
          current.body.setRotation(quaternionFromEuler(component.rotation), true);
        }
        continue;
      }

      const bounds = localBounds(component);
      const center = bounds.min.map((value, index) => (value + bounds.max[index]) * 0.5 * SCENE_METERS_PER_UNIT);
      const half = bounds.min.map((value, index) => Math.max(0.001, (bounds.max[index] - value) * 0.5 * SCENE_METERS_PER_UNIT));
      const material = normalizedMaterial(component);
      const descriptor = (mode === "dynamic" ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed())
        .setTranslation(
          component.position[0] * SCENE_METERS_PER_UNIT,
          component.position[1] * SCENE_METERS_PER_UNIT,
          component.position[2] * SCENE_METERS_PER_UNIT,
        )
        .setRotation(quaternionFromEuler(component.rotation));
      if (mode === "dynamic") {
        descriptor.setAdditionalMass(material.massKg).setLinearDamping(0.08).setAngularDamping(0.15).setCanSleep(true).setCcdEnabled(true);
      }
      const body = this.world.createRigidBody(descriptor);
      const colliderDescriptor = RAPIER.ColliderDesc.cuboid(half[0], half[1], half[2])
        .setTranslation(center[0], center[1], center[2])
        .setFriction(material.friction)
        .setRestitution(material.restitution)
        .setDensity(0);
      const collider = this.world.createCollider(colliderDescriptor, body);
      this.bodies.set(component.id, { body, collider, mode, shapeKey: nextShapeKey });
    }
    this.syncJoints(components);
  }

  private removeJoint(childId: string) {
    const record = this.joints.get(childId);
    if (!record) return;
    this.world.removeImpulseJoint(record.joint, true);
    this.joints.delete(childId);
  }

  private syncJoints(components: CircuitComponent[]) {
    const desired = new Map<string, { parent: BodyRecord; child: BodyRecord; kind: "fixed" | "revolute" | "prismatic"; signature: string }>();
    for (const component of components) {
      const parentId = String(component.state.physicsParentId || "");
      const kind = component.state.physicsJointType;
      const child = this.bodies.get(component.id);
      const parent = this.bodies.get(parentId);
      if (!parentId || parentId === component.id || !child || !parent ||
          (kind !== "fixed" && kind !== "revolute" && kind !== "prismatic")) continue;
      const signature = `${parentId}:${kind}`;
      desired.set(component.id, { parent, child, kind, signature });
    }
    for (const [childId, record] of this.joints) {
      if (desired.get(childId)?.signature !== record.signature) this.removeJoint(childId);
    }
    for (const [childId, request] of desired) {
      if (this.joints.has(childId)) continue;
      const origin = { x: 0, y: 0, z: 0 };
      const axis = { x: 0, y: 1, z: 0 };
      const identity = { x: 0, y: 0, z: 0, w: 1 };
      const data = request.kind === "fixed"
        ? RAPIER.JointData.fixed(origin, identity, origin, identity)
        : request.kind === "revolute"
          ? RAPIER.JointData.revolute(origin, origin, axis)
          : RAPIER.JointData.prismatic(origin, origin, axis);
      const joint = this.world.createImpulseJoint(data, request.parent.body, request.child.body, true);
      this.joints.set(childId, { joint, signature: request.signature });
    }
  }

  step(count = 1) {
    for (let i = 0; i < Math.max(0, Math.min(100, Math.trunc(count))); i++) this.world.step();
  }

  transforms(): Record<string, RigidTransform> {
    const result: Record<string, RigidTransform> = {};
    for (const [id, record] of this.bodies) {
      if (record.mode !== "dynamic") continue;
      const position = record.body.translation();
      result[id] = {
        position: [position.x / SCENE_METERS_PER_UNIT, position.y / SCENE_METERS_PER_UNIT, position.z / SCENE_METERS_PER_UNIT],
        rotation: eulerFromQuaternion(record.body.rotation()),
      };
    }
    return result;
  }

  dispose() {
    this.joints.clear();
    this.world.free();
    this.bodies.clear();
  }
}
