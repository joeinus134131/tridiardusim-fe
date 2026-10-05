/* eslint-disable @typescript-eslint/no-require-imports -- Standalone golden-test bridge. */
const fs = require("node:fs");
const path = require("node:path");
const { eduArm3Dof } = require(path.join(process.argv[2], "robots.js"));
const { expSE3, forwardKinematics, logSE3, spaceJacobian, solveIKDLS, solvePositionIKDLS } = require(path.join(process.argv[2], "kinematics.js"));
const samples = JSON.parse(fs.readFileSync(0, "utf8"));
process.stdout.write(JSON.stringify(samples.map(({ joints, twist, amount, ikTarget, ikInitialAngles }) => {
  const output = {
    fk: forwardKinematics(eduArm3Dof.joints, joints, eduArm3Dof.home),
    exp: expSE3(twist, amount),
    log: logSE3(expSE3(twist, amount)),
    jacobian: spaceJacobian(eduArm3Dof.joints, joints),
  };
  if (ikTarget) {
    const start = performance.now();
    output.ik = solveIKDLS(eduArm3Dof.joints, [0, 0, 0], eduArm3Dof.home, ikTarget.flat());
    output.ikElapsedMs = performance.now() - start;
    const positionStart = performance.now();
    output.positionIk = solvePositionIKDLS(eduArm3Dof.joints, ikInitialAngles, eduArm3Dof.home, [ikTarget[0][3], ikTarget[1][3], ikTarget[2][3]]);
    output.positionIkElapsedMs = performance.now() - positionStart;
  }
  return output;
})));
