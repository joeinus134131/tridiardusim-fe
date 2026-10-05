/// <reference lib="webworker" />
import { RigidBodyWorld, type RigidTransform } from "./rigidBody";
import type { CircuitComponent } from "../components/componentTypes";

type WorkerRequest =
  | { type: "start"; components: CircuitComponent[] }
  | { type: "sync"; components: CircuitComponent[] }
  | { type: "step"; count: number }
  | { type: "dispose" };

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
let physics: RigidBodyWorld | null = null;
let pending: Promise<void> = Promise.resolve();

function sendTransforms(transforms: Record<string, RigidTransform>) {
  const ids = Object.keys(transforms);
  const values = new Float32Array(ids.length * 6);
  ids.forEach((id, index) => {
    const transform = transforms[id];
    values.set([...transform.position, ...transform.rotation], index * 6);
  });
  workerScope.postMessage({ type: "physics_frame", ids, values }, [values.buffer]);
}

workerScope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  pending = pending.then(async () => {
    if (message.type === "start") {
      physics?.dispose();
      const usesPhysics = message.components.some((component) => component.state.physicsMode === "dynamic" || component.state.physicsMode === "fixed");
      physics = usesPhysics ? await RigidBodyWorld.create() : null;
      physics?.sync(message.components);
      workerScope.postMessage({ type: "physics_ready" });
    } else if (message.type === "sync") {
      const usesPhysics = message.components.some((component) => component.state.physicsMode === "dynamic" || component.state.physicsMode === "fixed");
      if (usesPhysics && !physics) physics = await RigidBodyWorld.create();
      if (!usesPhysics && physics) {
        physics.dispose();
        physics = null;
      }
      physics?.sync(message.components);
    } else if (message.type === "step" && physics) {
      physics.step(message.count);
      sendTransforms(physics.transforms());
    } else if (message.type === "dispose") {
      physics?.dispose();
      physics = null;
    }
  }).catch((error: unknown) => {
    workerScope.postMessage({ type: "physics_error", message: error instanceof Error ? error.message : String(error) });
  });
};
