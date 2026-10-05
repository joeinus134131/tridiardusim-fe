export type Vec3 = [number, number, number];
export type Twist = [number, number, number, number, number, number];
/** Row-major homogeneous transform; twists are [wx, wy, wz, vx, vy, vz]. */
export type Transform = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];
type Mat3 = [number,number,number,number,number,number,number,number,number];
export type JointType = "revolute" | "prismatic";
export interface JointSpec {
  type: JointType;
  axis: Vec3;
  point: Vec3;
  min: number;
  max: number;
}

const EPS = 1e-12;
const identity = (): Transform => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
const norm = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
const scale = (v: Vec3, s: number): Vec3 => [v[0]*s, v[1]*s, v[2]*s];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const normalized = (v: Vec3): Vec3 => {
  const n = norm(v);
  if (!Number.isFinite(n) || n < EPS) throw new Error("Sumbu sendi harus berupa vektor non-nol.");
  return scale(v, 1/n);
};

export function skew([x,y,z]: Vec3): [number,number,number,number,number,number,number,number,number] {
  return [0,-z,y, z,0,-x, -y,x,0];
}

export function multiplyTransform(a: Transform, b: Transform): Transform {
  const out = new Array<number>(16).fill(0);
  for (let r=0;r<4;r++) for(let c=0;c<4;c++)
    for(let k=0;k<4;k++) out[r*4+c] += a[r*4+k]*b[k*4+c];
  return out as Transform;
}

export function inverseTransform(t: Transform): Transform {
  const [a,b,c,px,d,e,f,py,g,h,i,pz] = t;
  return [a,d,g,-(a*px+d*py+g*pz), b,e,h,-(b*px+e*py+h*pz), c,f,i,-(c*px+f*py+i*pz), 0,0,0,1];
}

export function expSO3(omegaTheta: Vec3): Mat3 {
  const theta = norm(omegaTheta);
  const I: Mat3 = [1,0,0,0,1,0,0,0,1];
  if (theta < EPS) return I;
  const w = scale(omegaTheta, 1/theta);
  const W = skew(w);
  const W2 = [
    W[0]*W[0]+W[1]*W[3]+W[2]*W[6], W[0]*W[1]+W[1]*W[4]+W[2]*W[7], W[0]*W[2]+W[1]*W[5]+W[2]*W[8],
    W[3]*W[0]+W[4]*W[3]+W[5]*W[6], W[3]*W[1]+W[4]*W[4]+W[5]*W[7], W[3]*W[2]+W[4]*W[5]+W[5]*W[8],
    W[6]*W[0]+W[7]*W[3]+W[8]*W[6], W[6]*W[1]+W[7]*W[4]+W[8]*W[7], W[6]*W[2]+W[7]*W[5]+W[8]*W[8],
  ];
  return I.map((x,k)=>x + Math.sin(theta)*W[k] + (1-Math.cos(theta))*W2[k]) as Mat3;
}

export function logSO3(r: readonly number[]): Vec3 {
  const m = r.length === 16 ? [r[0],r[1],r[2],r[4],r[5],r[6],r[8],r[9],r[10]] : r;
  const cosTheta = Math.max(-1, Math.min(1, (m[0]+m[4]+m[8]-1)/2));
  const theta = Math.acos(cosTheta);
  if (theta < 1e-7) return [(m[7]-m[5])/2, (m[2]-m[6])/2, (m[3]-m[1])/2];
  if (Math.PI-theta < 1e-5) {
    let axis: Vec3;
    if (m[0] >= m[4] && m[0] >= m[8]) {
      const x=Math.sqrt(Math.max(EPS,(m[0]+1)/2));
      axis=[x,(m[1]+m[3])/(4*x),(m[2]+m[6])/(4*x)];
    } else if (m[4] >= m[8]) {
      const y=Math.sqrt(Math.max(EPS,(m[4]+1)/2));
      axis=[(m[1]+m[3])/(4*y),y,(m[5]+m[7])/(4*y)];
    } else {
      const z=Math.sqrt(Math.max(EPS,(m[8]+1)/2));
      axis=[(m[2]+m[6])/(4*z),(m[5]+m[7])/(4*z),z];
    }
    return scale(normalized(axis), theta);
  }
  const k = theta/(2*Math.sin(theta));
  return [k*(m[7]-m[5]), k*(m[2]-m[6]), k*(m[3]-m[1])];
}

export function expSE3(twist: Twist, theta: number): Transform {
  const w: Vec3 = [twist[0],twist[1],twist[2]], v: Vec3 = [twist[3],twist[4],twist[5]];
  const wNorm = norm(w);
  if (wNorm < EPS) {
    return [1,0,0,v[0]*theta, 0,1,0,v[1]*theta, 0,0,1,v[2]*theta, 0,0,0,1];
  }
  const wn = scale(w,1/wNorm), vn = scale(v,1/wNorm), angle=theta*wNorm;
  if (Math.abs(angle) < 1e-8) {
    const wCrossV = cross(w, v);
    const p: Vec3 = [v[0]*theta + 0.5*wCrossV[0]*theta*theta, v[1]*theta + 0.5*wCrossV[1]*theta*theta, v[2]*theta + 0.5*wCrossV[2]*theta*theta];
    return [1,0,0,p[0], 0,1,0,p[1], 0,0,1,p[2], 0,0,0,1];
  }
  const R = expSO3(scale(wn,angle));
  const W = skew(wn);
  const W2 = [
    W[0]*W[0]+W[1]*W[3]+W[2]*W[6], W[0]*W[1]+W[1]*W[4]+W[2]*W[7], W[0]*W[2]+W[1]*W[5]+W[2]*W[8],
    W[3]*W[0]+W[4]*W[3]+W[5]*W[6], W[3]*W[1]+W[4]*W[4]+W[5]*W[7], W[3]*W[2]+W[4]*W[5]+W[5]*W[8],
    W[6]*W[0]+W[7]*W[3]+W[8]*W[6], W[6]*W[1]+W[7]*W[4]+W[8]*W[7], W[6]*W[2]+W[7]*W[5]+W[8]*W[8],
  ];
  const theta2 = angle*angle;
  const A = (1-Math.cos(angle))/theta2;
  const B = (angle-Math.sin(angle))/(theta2*angle);
  const V = [
    angle + A*theta2*W[0]+B*theta2*angle*W2[0], A*theta2*W[1]+B*theta2*angle*W2[1], A*theta2*W[2]+B*theta2*angle*W2[2],
    A*theta2*W[3]+B*theta2*angle*W2[3], angle + A*theta2*W[4]+B*theta2*angle*W2[4], A*theta2*W[5]+B*theta2*angle*W2[5],
    A*theta2*W[6]+B*theta2*angle*W2[6], A*theta2*W[7]+B*theta2*angle*W2[7], angle + A*theta2*W[8]+B*theta2*angle*W2[8],
  ];
  const p: Vec3 = [V[0]*vn[0]+V[1]*vn[1]+V[2]*vn[2], V[3]*vn[0]+V[4]*vn[1]+V[5]*vn[2], V[6]*vn[0]+V[7]*vn[1]+V[8]*vn[2]];
  return [R[0],R[1],R[2],p[0], R[3],R[4],R[5],p[1], R[6],R[7],R[8],p[2], 0,0,0,1];
}

export function logSE3(t: Transform): Twist {
  const omegaTheta = logSO3(t);
  const theta = norm(omegaTheta);
  const p: Vec3 = [t[3],t[7],t[11]];
  if (theta < 1e-7) return [0,0,0,...p];
  const w = scale(omegaTheta,1/theta), W=skew(w);
  const half=theta/2;
  const coefficient = theta < 1e-4 ? 1/12 + theta*theta/720 : (1-half/Math.tan(half))/(theta*theta);
  const Wp: Vec3 = [W[1]*p[1]+W[2]*p[2], W[3]*p[0]+W[5]*p[2], W[6]*p[0]+W[7]*p[1]];
  const W2p: Vec3 = [W[0]*Wp[0]+W[1]*Wp[1]+W[2]*Wp[2], W[3]*Wp[0]+W[4]*Wp[1]+W[5]*Wp[2], W[6]*Wp[0]+W[7]*Wp[1]+W[8]*Wp[2]];
  const v: Vec3 = [p[0]-0.5*theta*Wp[0]+coefficient*theta*theta*W2p[0], p[1]-0.5*theta*Wp[1]+coefficient*theta*theta*W2p[1], p[2]-0.5*theta*Wp[2]+coefficient*theta*theta*W2p[2]];
  return [...omegaTheta,...v];
}

function screw(j: JointSpec): Twist {
  const axis=normalized(j.axis);
  if (j.type === "prismatic") return [0,0,0,...axis];
  return [...axis,...scale(cross(axis,j.point),-1)];
}

export function forwardKinematics(joints: readonly JointSpec[], values: readonly number[], home: Transform): Transform {
  if (joints.length !== values.length) throw new Error("Jumlah nilai joint harus sama dengan jumlah joint.");
  let t=identity();
  for(let i=0;i<joints.length;i++) t=multiplyTransform(t,expSE3(screw(joints[i]),values[i]));
  return multiplyTransform(t,home);
}

function multiply6(a: number[][], b: number[][]): number[][] {
  return a.map(row=>b[0].map((_,c)=>row.reduce((sum,x,k)=>sum+x*b[k][c],0)));
}

export function spaceJacobian(joints: readonly JointSpec[], values: readonly number[]): number[][] {
  const J=Array.from({length:6},()=>Array(joints.length).fill(0));
  let t=identity();
  for(let c=0;c<joints.length;c++) {
    const s=screw(joints[c]);
    const R=t;
    const w: Vec3 = [R[0]*s[0]+R[1]*s[1]+R[2]*s[2], R[4]*s[0]+R[5]*s[1]+R[6]*s[2], R[8]*s[0]+R[9]*s[1]+R[10]*s[2]];
    const v0: Vec3 = [R[0]*s[3]+R[1]*s[4]+R[2]*s[5], R[4]*s[3]+R[5]*s[4]+R[6]*s[5], R[8]*s[3]+R[9]*s[4]+R[10]*s[5]];
    const p: Vec3=[R[3],R[7],R[11]], v=cross(p,w).map((x,i)=>x+v0[i]) as Vec3;
    [...w,...v].forEach((x,r)=>J[r][c]=x);
    t=multiplyTransform(t,expSE3(s,values[c]));
  }
  return J;
}

function solveLinear(a: number[][], b: number[]): number[] | null {
  const n=b.length, m=a.map((row,i)=>[...row,b[i]]);
  for(let c=0;c<n;c++) {
    let pivot=c;
    for(let r=c+1;r<n;r++) if(Math.abs(m[r][c])>Math.abs(m[pivot][c])) pivot=r;
    if(Math.abs(m[pivot][c])<1e-14) return null;
    [m[c],m[pivot]]=[m[pivot],m[c]];
    const d=m[c][c]; for(let k=c;k<=n;k++) m[c][k]/=d;
    for(let r=0;r<n;r++) if(r!==c) { const f=m[r][c]; for(let k=c;k<=n;k++) m[r][k]-=f*m[c][k]; }
  }
  return m.map(row=>row[n]);
}

export interface IKResult { success: boolean; angles: number[]; iterations: number; positionError: number; orientationError: number; }
export function solveIKDLS(joints: readonly JointSpec[], initial: readonly number[], home: Transform, target: Transform, options: { maxIterations?: number; tolerance?: number; damping?: number; maxStep?: number } = {}): IKResult {
  const maxIterations=options.maxIterations??100, tolerance=options.tolerance??1e-4, damping=options.damping??0.05, maxStep=options.maxStep??0.2;
  if(initial.length!==joints.length) throw new Error("Jumlah nilai joint harus sama dengan jumlah joint.");
  const theta=initial.map((x,i)=>Math.max(joints[i].min,Math.min(joints[i].max,x)));
  let positionError=Infinity, orientationError=Infinity, iterations=0;
  for(let iteration=0;iteration<=maxIterations;iteration++) {
    iterations=iteration;
    const current=forwardKinematics(joints,theta,home), err=logSE3(multiplyTransform(inverseTransform(current),target));
    positionError=Math.hypot(current[3]-target[3],current[7]-target[7],current[11]-target[11]);
    orientationError=Math.hypot(err[0],err[1],err[2]);
    if(positionError<tolerance && orientationError<tolerance) return {success:true,angles:theta,iterations:iteration,positionError,orientationError};
    if(iteration===maxIterations) break;
    const Js=spaceJacobian(joints,theta), inv=inverseTransform(current);
    const R=inv;
    const Jb=Js.map((_,r)=>Js[0].map((__,c)=>{
      const w: Vec3=[Js[0][c],Js[1][c],Js[2][c]], v: Vec3=[Js[3][c],Js[4][c],Js[5][c]];
      const rw: Vec3=[R[0]*w[0]+R[1]*w[1]+R[2]*w[2],R[4]*w[0]+R[5]*w[1]+R[6]*w[2],R[8]*w[0]+R[9]*w[1]+R[10]*w[2]];
      const rv: Vec3=[R[0]*v[0]+R[1]*v[1]+R[2]*v[2],R[4]*v[0]+R[5]*v[1]+R[6]*v[2],R[8]*v[0]+R[9]*v[1]+R[10]*v[2]];
      const p: Vec3=[R[3],R[7],R[11]], pv=cross(p,rw);
      return r<3?rw[r]:rv[r-3]+pv[r-3];
    }));
    const jj=multiply6(Jb,Jb[0].map((_,c)=>Jb.map(row=>row[c])));
    for(let d=0;d<6;d++) jj[d][d]+=damping*damping;
    const y=solveLinear(jj,err);
    if(!y) break;
    const delta=Jb[0].map((_,c)=>Jb.reduce((sum,row,r)=>sum+row[c]*y[r],0));
    for(let i=0;i<theta.length;i++) theta[i]=Math.max(joints[i].min,Math.min(joints[i].max,theta[i]+Math.max(-maxStep,Math.min(maxStep,delta[i]))));
  }
  return {success:false,angles:theta,iterations,positionError,orientationError};
}

export function solvePositionIKDLS(joints: readonly JointSpec[], initial: readonly number[], home: Transform, target: Vec3, options: { maxIterations?: number; tolerance?: number; damping?: number; maxStep?: number } = {}): IKResult {
  const maxIterations=options.maxIterations??120, tolerance=options.tolerance??1e-4, damping=options.damping??0.025, maxStep=options.maxStep??0.1;
  if(initial.length!==joints.length) throw new Error("Jumlah nilai joint harus sama dengan jumlah joint.");
  const theta=initial.map((x,i)=>Math.max(joints[i].min,Math.min(joints[i].max,x)));
  let positionError=Infinity, iterations=0, adaptiveDamping=damping;
  for(let iteration=0;iteration<=maxIterations;iteration++) {
    iterations=iteration;
    const current=forwardKinematics(joints,theta,home), p: Vec3=[current[3],current[7],current[11]];
    const error: Vec3=[target[0]-p[0],target[1]-p[1],target[2]-p[2]];
    positionError=norm(error);
    if(positionError<tolerance) return {success:true,angles:theta,iterations:iteration,positionError,orientationError:0};
    if(iteration===maxIterations) break;
    const J=spaceJacobian(joints,theta), Jp=J.slice(3).map((_,r)=>J[0].map((__,c)=>{
      const w: Vec3=[J[0][c],J[1][c],J[2][c]], v: Vec3=[J[3][c],J[4][c],J[5][c]];
      const wxp=cross(w,p);
      return v[r]+wxp[r];
    }));
    const JT=Jp[0].map((_,c)=>Jp.map(row=>row[c]));
    const gram=Jp.map(row=>Jp.map((_,c)=>row.reduce((sum,x,k)=>sum+x*JT[k][c],0)));
    const gradient=JT.map(column=>column.reduce((sum,value,r)=>sum+value*error[r],0));
    if(Math.hypot(...gradient)<Math.max(1e-8,tolerance*0.1)) {
      const nudge=Math.min(0.02,Math.max(1e-3,maxStep*0.1));
      let bestTheta=theta, bestError=positionError;
      for(let first=0;first<theta.length;first++) for(let second=first;second<theta.length;second++)
        for(const firstDirection of [-1,1]) for(const secondDirection of [-1,1]) {
          const candidate=theta.slice();
          candidate[first]=Math.max(joints[first].min,Math.min(joints[first].max,candidate[first]+firstDirection*nudge));
          if(second!==first) candidate[second]=Math.max(joints[second].min,Math.min(joints[second].max,candidate[second]+secondDirection*nudge));
          const pose=forwardKinematics(joints,candidate,home);
          const candidateError=Math.hypot(pose[3]-target[0],pose[7]-target[1],pose[11]-target[2]);
          if(candidateError<bestError) { bestError=candidateError; bestTheta=candidate; }
        }
      if(bestError<positionError-Math.max(1e-12,tolerance*1e-3)) {
        for(let i=0;i<theta.length;i++) theta[i]=bestTheta[i];
        adaptiveDamping=damping;
        continue;
      }
    }
    let accepted=false;
    for(let attempt=0;attempt<6;attempt++) {
      const normal=gram.map((row,r)=>row.map((value,c)=>value+(r===c?adaptiveDamping*adaptiveDamping:0)));
      const y=solveLinear(normal,error);
      if(!y) { adaptiveDamping*=2; continue; }
      const candidate=theta.map((value,i)=>{
        const delta=JT[i].reduce((sum,x,r)=>sum+x*y[r],0);
        return Math.max(joints[i].min,Math.min(joints[i].max,value+Math.max(-maxStep,Math.min(maxStep,delta))));
      });
      const candidateTransform=forwardKinematics(joints,candidate,home);
      const candidateError=Math.hypot(candidateTransform[3]-target[0],candidateTransform[7]-target[1],candidateTransform[11]-target[2]);
      if(candidateError<positionError-Math.max(1e-12,tolerance*0.01)) {
        for(let i=0;i<theta.length;i++) theta[i]=candidate[i];
        adaptiveDamping=Math.max(damping,adaptiveDamping*0.5);
        accepted=true;
        break;
      }
      adaptiveDamping=Math.min(1e3,adaptiveDamping*2);
    }
    if(!accepted) {
      // A fully extended arm has a singular position Jacobian in the reach direction.
      // Try a bounded coordinate nudge so the next DLS step can see that second-order motion.
      const nudge=Math.min(0.02,Math.max(1e-3,maxStep*0.1));
      let bestTheta=theta, bestError=positionError;
      for(let joint=0;joint<theta.length;joint++) for(const direction of [-1,1]) {
        const candidate=theta.slice();
        candidate[joint]=Math.max(joints[joint].min,Math.min(joints[joint].max,candidate[joint]+direction*nudge));
        const pose=forwardKinematics(joints,candidate,home);
        const error=Math.hypot(pose[3]-target[0],pose[7]-target[1],pose[11]-target[2]);
        if(error<bestError) { bestError=error; bestTheta=candidate; }
      }
      for(let first=0;first<theta.length;first++) for(let second=first+1;second<theta.length;second++)
        for(const firstDirection of [-1,1]) for(const secondDirection of [-1,1]) {
          const candidate=theta.slice();
          candidate[first]=Math.max(joints[first].min,Math.min(joints[first].max,candidate[first]+firstDirection*nudge));
          candidate[second]=Math.max(joints[second].min,Math.min(joints[second].max,candidate[second]+secondDirection*nudge));
          const pose=forwardKinematics(joints,candidate,home);
          const error=Math.hypot(pose[3]-target[0],pose[7]-target[1],pose[11]-target[2]);
          if(error<bestError) { bestError=error; bestTheta=candidate; }
        }
      if(bestError>=positionError) break;
      for(let i=0;i<theta.length;i++) theta[i]=bestTheta[i];
      adaptiveDamping=damping;
    }
  }
  return {success:false,angles:theta,iterations,positionError,orientationError:0};
}

export function fabrik(points: readonly Vec3[], target: Vec3, options: { tolerance?: number; maxIterations?: number } = {}): Vec3[] {
  if(points.length<2) throw new Error("FABRIK membutuhkan minimal dua titik.");
  const p=points.map(x=>[...x] as Vec3), root=[...p[0]] as Vec3;
  const lengths=p.slice(1).map((x,i)=>norm([x[0]-p[i][0],x[1]-p[i][1],x[2]-p[i][2]]));
  if(lengths.some(x=>x<EPS)) throw new Error("Panjang link harus positif.");
  const total=lengths.reduce((a,b)=>a+b,0), distance=norm([target[0]-root[0],target[1]-root[1],target[2]-root[2]]);
  if(distance>=total) {
    const dir=normalized([target[0]-root[0],target[1]-root[1],target[2]-root[2]]);
    for(let i=0;i<lengths.length;i++) p[i+1]=[p[i][0]+dir[0]*lengths[i],p[i][1]+dir[1]*lengths[i],p[i][2]+dir[2]*lengths[i]];
    return p;
  }
  const tolerance=options.tolerance??1e-4, maxIterations=options.maxIterations??32;
  for(let n=0;n<maxIterations;n++) {
    p[p.length-1]=[...target];
    for(let i=p.length-2;i>=0;i--) { const d=normalized([p[i][0]-p[i+1][0],p[i][1]-p[i+1][1],p[i][2]-p[i+1][2]]); p[i]=[p[i+1][0]+d[0]*lengths[i],p[i+1][1]+d[1]*lengths[i],p[i+1][2]+d[2]*lengths[i]]; }
    p[0]=root;
    for(let i=0;i<p.length-1;i++) { const d=normalized([p[i+1][0]-p[i][0],p[i+1][1]-p[i][1],p[i+1][2]-p[i][2]]); p[i+1]=[p[i][0]+d[0]*lengths[i],p[i][1]+d[1]*lengths[i],p[i][2]+d[2]*lengths[i]]; }
    if(norm([p[p.length-1][0]-target[0],p[p.length-1][1]-target[1],p[p.length-1][2]-target[2]])<tolerance) break;
  }
  return p;
}

export function quinticPosition(start: number, end: number, duration: number, time: number): number {
  if(!Number.isFinite(duration)||duration<=0) throw new Error("Durasi trajectory harus positif.");
  const u=Math.max(0,Math.min(1,time/duration)), delta=end-start;
  return start+delta*(10*u**3-15*u**4+6*u**5);
}
