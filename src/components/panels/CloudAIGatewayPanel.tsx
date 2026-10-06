"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, X, Link2, Unplug, Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { robotModelForComponent, validateActionChunk, validateGatewayUrl } from "@/lib/ai/actionProtocol";
import type { RGBDFrame } from "@/lib/simulation/sensors/types";

interface ActiveJointTarget {
  robotId: string;
  jointIndex: number;
  startRad: number;
  targetRad: number;
  startSimMs: number;
  durationMs: number;
}

async function cameraFrameMessage(frame: RGBDFrame, cameraId: string, robotId: string, joints: readonly number[], sequence: number) {
  const width = Math.min(320, frame.width);
  const height = Math.max(1, Math.round(frame.height * width / frame.width));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas kamera tidak tersedia.");

  const pixels = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const sourceY = frame.height - 1 - Math.min(frame.height - 1, Math.floor(y * frame.height / height));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(frame.width - 1, Math.floor(x * frame.width / width));
      const sourceOffset = (sourceY * frame.width + sourceX) * 4;
      const targetOffset = (y * width + x) * 4;
      pixels.data[targetOffset] = frame.rgba[sourceOffset];
      pixels.data[targetOffset + 1] = frame.rgba[sourceOffset + 1];
      pixels.data[targetOffset + 2] = frame.rgba[sourceOffset + 2];
      pixels.data[targetOffset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Gagal mengodekan frame kamera.")), "image/jpeg", 0.65));
  if (jpeg.size > 256_000) throw new Error("Frame JPEG melewati batas 256 KB.");
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return JSON.stringify({
    type: "camera_frame",
    protocolVersion: 1,
    sequence,
    simTimeMs: frame.capturedAtSimMs,
    cameraId,
    width,
    height,
    imageJpegBase64: btoa(binary),
    robot: { id: robotId, jointsRad: [...joints] },
  });
}

export function CloudAIGatewayPanel() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("wss://");
  const [cameraId, setCameraId] = useState("");
  const [robotId, setRobotId] = useState("");
  const [rateHz, setRateHz] = useState(5);
  const [status, setStatus] = useState(t.aiGateway.disconnected);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const [sentCount, setSentCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const components = useSimulatorStore((state) => state.components);
  const cameras = useMemo(() => components.filter((component) => component.typeId === "rgbd_camera"), [components]);
  const robots = useMemo(() => components.filter((component) => component.typeId === "edu_arm_3dof" || component.typeId === "aero_arm_6dof"), [components]);
  const activeCameraId = cameras.some((camera) => camera.id === cameraId) ? cameraId : cameras[0]?.id || "";
  const activeRobotId = robots.some((robot) => robot.id === robotId) ? robotId : robots[0]?.id || "";
  const frame = useSimulatorStore((state) => activeCameraId ? state.rgbdFrames[activeCameraId] : undefined);
  const simulationState = useSimulatorStore((state) => state.simulationState);
  const socketRef = useRef<WebSocket | null>(null);
  const sendingRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const frameSequenceRef = useRef(0);
  const lastSentFrameRef = useRef("");
  const lastActionSequenceRef = useRef(-1);
  const targetsRef = useRef(new Map<string, ActiveJointTarget>());
  const selectedRobotRef = useRef(robotId);
  useEffect(() => { selectedRobotRef.current = activeRobotId; }, [activeRobotId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = useSimulatorStore.getState();
      if (state.simulationState === "stopped") {
        targetsRef.current.clear();
        return;
      }
      if (state.simulationState !== "running") return;

      const updates = new Map<string, Record<string, number>>();
      for (const [key, target] of targetsRef.current) {
        const robot = state.components.find((component) => component.id === target.robotId);
        if (!robot) { targetsRef.current.delete(key); continue; }
        const progress = Math.max(0, Math.min(1, (state.elapsedMs - target.startSimMs) / target.durationMs));
        const value = target.startRad + (target.targetRad - target.startRad) * progress;
        const current = updates.get(target.robotId) || {};
        current[`joint${target.jointIndex}`] = value;
        updates.set(target.robotId, current);
      }
      for (const [id, update] of updates) state.updateComponentState(id, update);
    }, 50);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!frame || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || simulationState !== "running" || sendingRef.current) return;
    const frameKey = `${activeCameraId}:${frame.sampleCount}`;
    if (frameKey === lastSentFrameRef.current) return;
    const now = performance.now();
    if (now - lastSentAtRef.current < 1000 / rateHz) return;
    const robot = robots.find((item) => item.id === activeRobotId);
    const model = robot ? robotModelForComponent(robot) : null;
    if (!robot || !model) return;
    sendingRef.current = true;
    void cameraFrameMessage(frame, activeCameraId, activeRobotId, model.joints.map((_, index) => Number(robot.state[`joint${index}`]) || 0), ++frameSequenceRef.current)
      .then((message) => {
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN && socket.bufferedAmount < 512_000) {
          socket.send(message);
          lastSentAtRef.current = performance.now();
          lastSentFrameRef.current = frameKey;
          setSentCount((count) => count + 1);
        }
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Gagal menyiapkan frame kamera."))
      .finally(() => { sendingRef.current = false; });
  }, [activeCameraId, activeRobotId, frame, rateHz, robots, simulationState]);

  useEffect(() => () => {
    socketRef.current?.close(1000, "panel unmounted");
    socketRef.current = null;
  }, []);

  const disconnect = () => {
    const socket = socketRef.current;
    socketRef.current = null;
    targetsRef.current.clear();
    socket?.close(1000, "user disconnected");
    setIsConnected(false);
    setStatus(t.aiGateway.disconnected);
  };

  const connect = () => {
    setError("");
    try {
      const endpoint = validateGatewayUrl(url);
      if (!activeCameraId || !frame) throw new Error(t.aiGateway.noCamera);
      if (!activeRobotId || !robots.some((robot) => robot.id === activeRobotId)) throw new Error(t.aiGateway.noRobot);
      disconnect();
      setStatus(t.aiGateway.connecting);
      const socket = new WebSocket(endpoint);
      socketRef.current = socket;
      lastActionSequenceRef.current = -1;
      setIsConnected(true);
      socket.onopen = () => {
        if (socketRef.current !== socket) return;
        socket.send(JSON.stringify({ type: "hello", protocolVersion: 1, role: "simulator", actionChunkRateHz: rateHz }));
        setStatus(t.aiGateway.waiting);
      };
      socket.onmessage = (event) => {
        if (typeof event.data !== "string") { setError("Gateway hanya boleh mengirim pesan JSON teks."); return; }
        try {
          const parsed: unknown = JSON.parse(event.data);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed as Record<string, unknown>).type === "ready" && (parsed as Record<string, unknown>).protocolVersion === 1) {
            setStatus(t.aiGateway.connected);
            return;
          }
          const current = useSimulatorStore.getState();
          const chunk = validateActionChunk(event.data, current.components, selectedRobotRef.current);
          if (chunk.sequence <= lastActionSequenceRef.current) return;
          if (current.simulationState === "stopped") { setError("Action chunk diabaikan karena simulasi berhenti."); return; }
          const robot = current.components.find((item) => item.id === selectedRobotRef.current);
          if (!robot) return;
          lastActionSequenceRef.current = chunk.sequence;
          const startSimMs = current.elapsedMs;
          for (const target of chunk.joints) {
            const key = `${target.robotId}:${target.jointIndex}`;
            targetsRef.current.set(key, {
              ...target,
              startRad: Number(robot.state[`joint${target.jointIndex}`]) || 0,
              startSimMs,
              durationMs: chunk.validForMs,
            });
          }
          setReceivedCount((count) => count + 1);
          setStatus(t.aiGateway.connected);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Action chunk ditolak.");
        }
      };
      socket.onerror = () => setError("Koneksi WebSocket gagal. Periksa endpoint gateway.");
      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
          setIsConnected(false);
          targetsRef.current.clear();
          setStatus(t.aiGateway.disconnected);
        }
      };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat membuka gateway.");
    }
  };

  if (!open) return (
    <button className="absolute right-3 top-3 z-[var(--z-panel)] flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-lg hover:border-[var(--accent)]" onClick={() => setOpen(true)} title={t.aiGateway.open}>
      <Bot size={16} className="text-[var(--accent)]" /> {t.aiGateway.open}
    </button>
  );

  return (
    <section className="cloud-ai-gateway-panel z-[var(--z-panel)] flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Bot size={18} className="text-[var(--accent)]" /><strong className="text-sm">{t.aiGateway.title}</strong></div>
        <button className="btn-icon p-1.5" onClick={() => { disconnect(); setOpen(false); }} aria-label={t.common.close}><X size={15} /></button>
      </header>
      <p className="text-xs leading-relaxed opacity-75">{t.aiGateway.description}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <a className="text-[var(--accent)] underline" href="https://colab.research.google.com/#create=true" target="_blank" rel="noreferrer">{t.aiGateway.openColab}</a>
        <a className="text-[var(--accent)] underline" href="/ai-gateway/colab_starter.ipynb" download>{t.aiGateway.downloadNotebook}</a>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        {t.aiGateway.url}
        <input className="inspector-input font-mono" value={url} onChange={(event) => setUrl(event.target.value)} disabled={isConnected} spellCheck={false} autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        {t.aiGateway.camera}
        <select className="inspector-input" value={activeCameraId} onChange={(event) => setCameraId(event.target.value)} disabled={isConnected}>
          {cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        {t.aiGateway.robot}
        <select className="inspector-input" value={activeRobotId} onChange={(event) => setRobotId(event.target.value)} disabled={isConnected}>
          {robots.map((robot) => <option key={robot.id} value={robot.id}>{robot.name}</option>)}
        </select>
      </label>
      <label className="flex items-center justify-between gap-3 text-xs">
        {t.aiGateway.rate}
        <select className="inspector-input w-24" value={rateHz} onChange={(event) => setRateHz(Number(event.target.value))} disabled={isConnected}>
          <option value={5}>5 Hz</option><option value={10}>10 Hz</option>
        </select>
      </label>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate" role="status">{status}</span>
        {!isConnected ? <button className="btn-primary flex items-center gap-1.5" onClick={connect}><Link2 size={14} />{t.aiGateway.connect}</button> : <button className="small-button flex items-center gap-1.5" onClick={disconnect}><Unplug size={14} />{t.aiGateway.disconnect}</button>}
      </div>
      {status === t.aiGateway.connecting && <div className="flex items-center gap-2 text-xs opacity-70"><Loader2 size={14} className="animate-spin" />{t.aiGateway.connecting}</div>}
      {simulationState !== "running" && <p className="text-[11px] text-amber-500">{t.aiGateway.running}</p>}
      {!!error && <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-500" role="alert">{error}</p>}
      <div className="flex justify-between text-[11px] opacity-70"><span>{t.aiGateway.sent}: {sentCount}</span><span>{t.aiGateway.received}: {receivedCount}</span></div>
      <p className="border-t border-[var(--border)] pt-2 text-[10px] leading-relaxed opacity-60">{t.aiGateway.policy}</p>
      <p className="text-[10px] leading-relaxed opacity-60">{t.aiGateway.secure}</p>
    </section>
  );
}
