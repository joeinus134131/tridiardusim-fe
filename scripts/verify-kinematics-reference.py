"""Compare the TypeScript EduArm PoE implementation with ModernRoboticsPython.

Requires optional development dependencies: numpy and modern_robotics.
Install with: python3 -m pip install -r requirements-kinematics-reference.txt
Run with: python3 scripts/verify-kinematics-reference.py
"""
import json
import math
import random
import shutil
import subprocess
import tempfile
from pathlib import Path

try:
    import modern_robotics as mr
    import numpy as np
except ImportError as exc:
    raise SystemExit(
        "Install the optional verification dependencies with: "
        "python3 -m pip install -r requirements-kinematics-reference.txt"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which("node")
if not NODE:
    raise SystemExit("Node.js is required to compile and evaluate the TypeScript implementation.")

with tempfile.TemporaryDirectory(prefix="eduarm-golden-") as temp:
    output = Path(temp)
    subprocess.run(
        [
            NODE,
            "node_modules/typescript/bin/tsc",
            "src/lib/robotics/kinematics.ts",
            "src/lib/robotics/robots.ts",
            "--outDir",
            str(output),
            "--target",
            "ES2020",
            "--module",
            "commonjs",
            "--skipLibCheck",
        ],
        cwd=ROOT,
        check=True,
    )

    Slist = np.array(
        [[0, 0, 0], [1, 0, 0], [0, 1, 1], [0, 0.05, 0.17], [0, 0, 0], [0, 0, 0]],
        dtype=float,
    )
    M = np.array(
        [[1, 0, 0, 0], [0, 1, 0, 0.27], [0, 0, 1, 0], [0, 0, 0, 1]],
        dtype=float,
    )
    rng = random.Random(0x12AB34CD)
    samples = [
        {
            "joints": [rng.uniform(-math.pi, math.pi), rng.uniform(-math.pi / 2, math.pi / 2), rng.uniform(-2.2, 2.2)],
            "axis": (lambda v: [x / math.sqrt(sum(y*y for y in v)) for x in v])([rng.uniform(-1, 1) for _ in range(3)]),
            "v": [rng.uniform(-0.5, 0.5) for _ in range(3)],
            "amount": rng.uniform(-2.8, 2.8),
        }
        for _ in range(10_000)
    ]
    for sample in samples:
        sample["twist"] = [*sample["axis"], *sample["v"]]
    for sample in samples[:250]:
        ik_joints = [rng.uniform(-0.6, 0.6), rng.uniform(-0.4, 0.4), rng.uniform(-0.6, 0.6)]
        sample["ikSourceAngles"] = ik_joints
        sample["ikInitialAngles"] = [max(low, min(high, value + rng.uniform(-0.02, 0.02))) for value, low, high in zip(ik_joints, [-math.pi, -math.pi / 2, -2.2], [math.pi, math.pi / 2, 2.2])]
        sample["ikTarget"] = mr.FKinSpace(M, Slist, ik_joints).tolist()
    result = subprocess.run(
        [NODE, "scripts/kinematics-reference-bridge.cjs", str(output)],
        cwd=ROOT,
        input=json.dumps(samples),
        text=True,
        capture_output=True,
        check=True,
    )
    actuals = json.loads(result.stdout)

max_position_error = 0.0
max_orientation_error = 0.0
max_exp_position_error = 0.0
max_exp_orientation_error = 0.0
max_log_error = 0.0
max_jacobian_error = 0.0
max_ik_position_error = 0.0
max_ik_orientation_error = 0.0
ik_successes = 0
ik_elapsed_ms = []
max_position_ik_error = 0.0
position_ik_elapsed_ms = []
if len(samples) != len(actuals):
    raise SystemExit("Worker returned an unexpected number of kinematics results.")
for sample, actual in zip(samples, actuals):
    joints = sample["joints"]
    expected = mr.FKinSpace(M, Slist, joints)
    fk = np.asarray(actual["fk"], dtype=float).reshape((4, 4))
    position_error = float(np.linalg.norm(fk[:3, 3] - expected[:3, 3]))
    rotation_error = float(np.linalg.norm(mr.so3ToVec(mr.MatrixLog3(fk[:3, :3].T @ expected[:3, :3]))))
    max_position_error = max(max_position_error, position_error)
    max_orientation_error = max(max_orientation_error, rotation_error)
    expected_exp = mr.MatrixExp6(mr.VecTose3([*(np.asarray(sample["twist"][:3]) * sample["amount"]), *(np.asarray(sample["twist"][3:]) * sample["amount"])]))
    exp = np.asarray(actual["exp"], dtype=float).reshape((4, 4))
    max_exp_position_error = max(max_exp_position_error, float(np.linalg.norm(exp[:3, 3] - expected_exp[:3, 3])))
    max_exp_orientation_error = max(max_exp_orientation_error, float(np.linalg.norm(mr.so3ToVec(mr.MatrixLog3(exp[:3, :3].T @ expected_exp[:3, :3])))))
    expected_log = np.asarray(mr.se3ToVec(mr.MatrixLog6(expected_exp)), dtype=float)
    max_log_error = max(max_log_error, float(np.linalg.norm(np.asarray(actual["log"], dtype=float) - expected_log)))
    expected_jacobian = np.asarray(mr.JacobianSpace(Slist, joints), dtype=float)
    max_jacobian_error = max(max_jacobian_error, float(np.max(np.abs(np.asarray(actual["jacobian"], dtype=float) - expected_jacobian))))
    if "ikTarget" in sample:
        expected_ik = np.asarray(sample["ikTarget"], dtype=float)
        _, reference_success = mr.IKinSpace(Slist, M, expected_ik, np.zeros(3), 1e-4, 1e-4)
        if not reference_success:
            raise SystemExit("ModernRoboticsPython IKinSpace failed on a generated reachable target.")
        candidate = actual["ik"]
        if not candidate["success"]:
            raise SystemExit(f"EduArm DLS failed to converge for reachable sample {ik_successes}: {candidate}; target={expected_ik.tolist()}")
        candidate_pose = mr.FKinSpace(M, Slist, np.asarray(candidate["angles"], dtype=float))
        position_error = float(np.linalg.norm(candidate_pose[:3, 3] - expected_ik[:3, 3]))
        orientation_error = float(np.linalg.norm(mr.so3ToVec(mr.MatrixLog3(candidate_pose[:3, :3].T @ expected_ik[:3, :3]))))
        max_ik_position_error = max(max_ik_position_error, position_error)
        max_ik_orientation_error = max(max_ik_orientation_error, orientation_error)
        ik_elapsed_ms.append(float(actual["ikElapsedMs"]))
        ik_successes += 1
        position_candidate = actual["positionIk"]
        if not position_candidate["success"]:
            raise SystemExit(f"EduArm position-only DLS failed for reachable target {ik_successes - 1}: {position_candidate}; source={sample['ikSourceAngles']}")
        position_pose = mr.FKinSpace(M, Slist, np.asarray(position_candidate["angles"], dtype=float))
        position_error = float(np.linalg.norm(position_pose[:3, 3] - expected_ik[:3, 3]))
        max_position_ik_error = max(max_position_ik_error, position_error)
        position_ik_elapsed_ms.append(float(actual["positionIkElapsedMs"]))

ik_elapsed_sorted = sorted(ik_elapsed_ms)
ik_p95_ms = ik_elapsed_sorted[min(len(ik_elapsed_sorted) - 1, math.ceil(0.95 * len(ik_elapsed_sorted)) - 1)] if ik_elapsed_sorted else 0.0
ik_max_ms = max(ik_elapsed_ms, default=0.0)
position_ik_sorted = sorted(position_ik_elapsed_ms)
position_ik_p95_ms = position_ik_sorted[min(len(position_ik_sorted) - 1, math.ceil(0.95 * len(position_ik_sorted)) - 1)] if position_ik_sorted else 0.0
position_ik_max_ms = max(position_ik_elapsed_ms, default=0.0)

if (max_position_error >= 1e-6 or max_orientation_error >= 1e-4 or
    max_exp_position_error >= 1e-6 or max_exp_orientation_error >= 1e-4 or
    max_log_error >= 1e-6 or max_jacobian_error >= 1e-6 or
    max_ik_position_error >= 1e-4 or max_ik_orientation_error >= 1e-4 or
    max_position_ik_error >= 1e-4 or ik_max_ms >= 5 or position_ik_max_ms >= 5):
    raise SystemExit(
        f"FAIL: FK position={max_position_error:.3e} m, FK orientation={max_orientation_error:.3e} rad, "
        f"exp position={max_exp_position_error:.3e} m, exp orientation={max_exp_orientation_error:.3e} rad, "
        f"log twist={max_log_error:.3e}, Jacobian={max_jacobian_error:.3e}, "
        f"DLS pose={max_ik_position_error:.3e} m/{max_ik_orientation_error:.3e} rad; "
        f"position-only DLS={max_position_ik_error:.3e} m; p95={ik_p95_ms:.3f}/{position_ik_p95_ms:.3f} ms"
    )

print(
    f"PASS 10,000 ModernRoboticsPython FK poses; "
    f"max FK position={max_position_error:.3e} m, FK orientation={max_orientation_error:.3e} rad; "
    f"exp position={max_exp_position_error:.3e} m, exp orientation={max_exp_orientation_error:.3e} rad; "
    f"log={max_log_error:.3e}, Jacobian={max_jacobian_error:.3e}; "
    f"{ik_successes} reachable-target DLS solves, max error={max_ik_position_error:.3e} m / {max_ik_orientation_error:.3e} rad; "
    f"position-only max error={max_position_ik_error:.3e} m; "
    f"DLS p95={ik_p95_ms:.3f}/{position_ik_p95_ms:.3f} ms, max={ik_max_ms:.3f}/{position_ik_max_ms:.3f} ms"
)
