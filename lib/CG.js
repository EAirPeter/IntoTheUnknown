"use strict"

let CG = {};

////////////////////////////// SUPPORT FOR SCALARS


CG.sMix = (a,b,t) => a * (1 - t) + b * t;
CG.clamp = (v,a,b) => Math.min(b, Math.max(a, v));

////////////////////////////// SUPPORT FOR VECTORS

CG.cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];

CG.neg = (a) => {
  let c = [];
  for (let i = 0; i < a.length; ++i)
    c.push(-a[i]);
  return c;
}

CG.add = (a, b) => {
  let c = [];
  for (let i = 0; i < a.length; ++i)
    c.push(a[i] + b[i]);
  return c;
}

CG.subtract = (a,b) => {
  let c = [];
  for (let i = 0; i < a.length; ++i)
    c.push(a[i] - b[i]);
  return c;
}

CG.dot = (a,b) => {
  let c = 0;
  for (let i = 0; i < a.length; ++i)
    c += a[i] * b[i];
  return c;
}

CG.mix = (a,b,t) => {
  let c = [];
  for (let i = 0; i < a.length; ++i)
    c.push(a[i] * (1 - t) + b[i] *t);
  return c;
}

CG.norm = (a) => Math.sqrt(CG.dot(a, a));

CG.normalize = (a) => {
  let s = CG.norm(a);
  let c = [];
  for (let i = 0; i < a.length; ++i)
    c.push(a[i] / s);
  return c;
}

CG.scale = (a,s) => {
  let c = [];
  for (let i = 0; i < a.length; ++i)
    c.push(a[i] * s);
  return c;
}

CG.abs = (a) => {
  let c = [];
  for (let i = 0; i < a.length; ++i)
    c.push(Math.abs(a[i]));
  return c;
}

CG.ik = (a,b,C,D) => {
  let c = CG.dot(C,C), x = (1 + (a*a - b*b)/c) / 2, y = CG.dot(C,D)/c;
  for (let i = 0 ; i < 3 ; i++) D[i] -= y * C[i];
  y = Math.sqrt(Math.max(0,a*a - c*x*x) / CG.dot(D,D));
  for (let i = 0 ; i < 3 ; i++) D[i] = x * C[i] + y * D[i];
  return D;
}

////////////////////////////// SUPPORT FOR QUATERNIONS

CG.qMult = (a,b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
                     a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
                     a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
                     a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];

CG.qMix = (a,b,t) => {
  let d = CG.dot(a, b);
  if (d < 0) {
    a = CG.neg(a);
    d = -d;
  }
  if (d > .9999)
    return CG.normalize(CG.mix(a, b, t));
  let th0 = Math.acos(d);
  let s0 = Math.sin(th0);
  let th = th0 * t;
  let s = Math.sin(th);
  let ka = Math.cos(th) - d * s / s0;
  let kb = s / s0;
  return CG.add(CG.scale(a, ka), CG.scale(b, kb));
}

////////////////////////////// SUPPORT FOR MATRICES

CG.matrixAimZ = function(Z) {
  Z = CG.normalize(Z);
  let X0 = CG.cross([0,1,0], Z), t0 = CG.dot(X0,X0), Y0 = CG.cross(Z, X0);
  let X1 = CG.cross([1,0,0], Z), t1 = CG.dot(X1,X1), Y1 = CG.cross(Z, X1);
  let t = t1 / (4 * t0 + t1);
  let X = CG.normalize(CG.mix(X0, X1, t));
  let Y = CG.normalize(CG.mix(Y0, Y1, t));
  return [X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, 0,0,0,1];
}
CG.matrixFromQuaternion = q => {
  var x = q[0], y = q[1], z = q[2], w = q[3];
  return [1 - 2 * (y * y + z * z),     2 * (z * w + x * y),     2 * (x * z - y * w), 0,
              2 * (y * x - z * w), 1 - 2 * (z * z + x * x),     2 * (x * w + y * z), 0,
              2 * (y * w + z * x),     2 * (z * y - x * w), 1 - 2 * (x * x + y * y), 0, 0,0,0,1];
}
CG.matrixIdentity = ()     => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
CG.matrixTranspose = a => {
  let b = [];
  for (let i = 0; i < 4; ++i)
    b.push(a[i + 0], a[i + 4], a[i + 8], a[i + 12]);
  return b;
}
CG.matrixInverse = a => {
  let b = [], d = 0, cf = (c, r) => {
    let s = (i, j) => a[c+i & 3 | (r+j & 3) << 2];
    return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
                      - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
                      + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
  }
  for (let n = 0 ; n < 16 ; n++) b.push(cf(n >> 2, n & 3));
  for (let n = 0 ; n <  4 ; n++) d += a[n] * b[n << 2];
  for (let n = 0 ; n < 16 ; n++) b[n] /= d;
  return b;
}
CG.matrixMultiply = (a, b)  => {
  let c = [];
  for (let n = 0 ; n < 16 ; n++)
    c.push( a[n&3   ] * b[  n&12] +
          a[n&3 |  4] * b[1 | n&12] +
          a[n&3 |  8] * b[2 | n&12] +
          a[n&3 | 12] * b[3 | n&12] );
  return c;
}
CG.matrixRotateX = t      => [1,0,0,0, 0,Math.cos(t),Math.sin(t),0, 0,-Math.sin(t),Math.cos(t),0, 0,0,0,1];
CG.matrixRotateY = t      => [Math.cos(t),0,-Math.sin(t),0, 0,1,0,0, Math.sin(t),0,Math.cos(t),0, 0,0,0,1];
CG.matrixRotateZ = t      => [Math.cos(t),Math.sin(t),0,0, -Math.sin(t),Math.cos(t),0,0, 0,0,1,0, 0,0,0,1];
CG.matrixScale = (x,y,z)    => [x,0,0,0, 0,y===undefined?x:y,0,0, 0,0,z===undefined?x:z,0, 0,0,0,1];
CG.matrixTransform = (m,v)  => {
  let x = v[0], y = v[1], z = v[2], w = (v[3] === undefined ? 1 : v[3]);
  return [m[0] * x + m[4] * y + m[8] * z + m[12] * w,
        m[1] * x + m[5] * y + m[9] * z + m[13] * w,
        m[2] * x + m[6] * y + m[10] * z + m[14] * w,
        m[3] * x + m[7] * y + m[11] * z + m[15] * w];
}
CG.matrixTranslate = (x,y,z) =>
  Array.isArray(x) ? [1,0,0,0, 0,1,0,0, 0,0,1,0, x[0],x[1],x[2],1]
              : [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];

let Matrix = function() {
  let topIndex = 0,
     stack = [CG.matrixIdentity()],
     getVal = () => stack[topIndex],
     setVal = m => { stack[topIndex] = m; return this; }

  this.aimZ       = v       => setVal(CG.matrixMultiply(getVal(), CG.matrixAimZ(v)));
  this.identity   = ()      => setVal(CG.matrixIdentity());
  this.multiply   = a       => setVal(CG.matrixMultiply(getVal(), a));
  this.restore    = ()      => --topIndex;
  this.rotateQ    = q       => setVal(CG.matrixMultiply(getVal(), CG.matrixFromQuaternion(q)));
  this.rotateX    = t       => setVal(CG.matrixMultiply(getVal(), CG.matrixRotateX(t)));
  this.rotateY    = t       => setVal(CG.matrixMultiply(getVal(), CG.matrixRotateY(t)));
  this.rotateZ    = t       => setVal(CG.matrixMultiply(getVal(), CG.matrixRotateZ(t)));
  this.save       = ()      => stack[++topIndex] = stack[topIndex-1].slice();
  this.scale      = (x,y,z) => setVal(CG.matrixMultiply(getVal(), CG.matrixScale(x,y,z)));
  this.set        = a       => setVal(a);
  this.transform  = v       => CG.matrixTransform(getVal(), v);
  this.translate  = (x,y,z) => setVal(CG.matrixMultiply(getVal(), CG.matrixTranslate(x,y,z)));
  this.value      = ()      => getVal();
}

////////////////////////////// SUPPORT FOR SPLINES

CG.evalCubicSpline = (coefs, t) => {
  t = Math.max(0, Math.min(1, t));
  let n = coefs.length / 4;
  let k = Math.min(n-1, Math.floor(n * t));
  let f = n * t - k;
  let a = coefs[4*k], b = coefs[4*k+1], c = coefs[4*k+2], d = coefs[4*k+3];
  return f * (f * (f * a + b) + c) + d;
}

CG.BezierBasisMatrix = [
  -1,  3, -3,  1,
   3, -6,  3,  0,
  -3,  3,  0,  0,
   1,  0,  0,  0
];

CG.bezierToCubic = B => {
  let n = Math.floor(B.length / 3);
  let C = [];
  for (let k = 0 ; k < n ; k++)
    C = C.concat(CG.matrixTransform(CG.BezierBasisMatrix, B.slice(3*k, 3*k+4)));
  return C;
}

////////////////////////////// SUPPORT FOR CREATING 3D SHAPES

const VERTEX_SIZE = 11;

CG.bindVbo = (vbo) => {
  if (vbo == CG.vboLast)
    return;
  CG.vboLast = vbo;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  let bpe = Float32Array.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(CG.aPos, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 0);
  gl.vertexAttribPointer(CG.aNor, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 3);
  gl.vertexAttribPointer(CG.aTan, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 6);
  gl.vertexAttribPointer(CG.aUV , 2, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 9);
}

CG.genVbo = (vtcs) => {
  let vbo = gl.createBuffer();
  CG.bindVbo(vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vtcs, gl.STATIC_DRAW);
  return vbo;
}

CG.Model = function(V) {
  let vtcs = Float32Array.from(V);
  let nvtc = vtcs.length / VERTEX_SIZE;
  this.draw = () => {
    if (this.vbo)
      CG.bindVbo(this.vbo);
    else
      this.vbo = CG.genVbo(vtcs);
    gl.drawArrays(gl.TRIANGLES, 0, nvtc);
  }
}

CG.Cube = function() {
  let V = [], P = [
    -1,-1, 1,  0, 0, 1,  1, 0, 0,  0,0,    1, 1, 1,  0, 0, 1,  1, 0, 0,  1,1,    -1, 1, 1,  0, 0, 1,  1, 0, 0,  0,1,
     1, 1, 1,  0, 0, 1,  1, 0, 0,  1,1,    -1,-1, 1,  0, 0, 1,  1, 0, 0,  0,0,    1,-1, 1,  0, 0, 1,  1, 0, 0,  1,0,

     1,-1,-1,  0, 0,-1,  -1, 0, 0,  0,0,    -1, 1,-1,  0, 0,-1,  -1, 0, 0,  1,1,    1, 1,-1,  0, 0,-1,  -1, 0, 0,  0,1,
    -1, 1,-1,  0, 0,-1,  -1, 0, 0,  1,1,    1,-1,-1,  0, 0,-1,  -1, 0, 0,  0,0,    -1,-1,-1,  0, 0,-1,  -1, 0, 0,  1,0
  ];
  for (let n = 0 ; n < 3 ; n++)
    for (let i = 0 ; i < P.length ; i += VERTEX_SIZE) {
      let p0 = [P[i ], P[i+ 1], P[i+ 2]],
      p1 = [P[i+ 3], P[i+ 4], P[i+ 5]],
      p2 = [P[i+ 6], P[i+ 7], P[i+ 8]],
      uv = [P[i+ 9], P[i+10]];
      V = V.concat(p0).concat(p1).concat(p2).concat(uv);
      for (let j = 0 ; j < 3 ; j++) {
        P[i  + j] = p0[(j+1) % 3];
        P[i+3 + j] = p1[(j+1) % 3];
        P[i+6 + j] = p2[(j+1) % 3];
      }
    }
  let vtcs = Float32Array.from(V);
  let nvtc = vtcs.length / VERTEX_SIZE;
  // To do: create edged cube by adding 12*2 edge triangles and 8 corner triangles.
  this.draw = () => {
    if (this.vbo)
      CG.bindVbo(this.vbo);
    else
      this.vbo = CG.genVbo(vtcs);
    gl.drawArrays(gl.TRIANGLES, 0, nvtc);
  }
}

CG.Disk = function(N) {
  let V = [];
  V.push(0, 0, 0, 0, 0, 1, 1, 0, 0, .5, .5);
  for (let i = 0; i <= N; ++i) {
    let t = 2 * Math.PI * i / N;
    let x = Math.cos(t);
    let y = Math.sin(t);
    V.push(x, y, 0, 0, 0, 1, 1, 0, 0, .5 + x * .5, .5 + y * .5);
  }
  let vtcs = Float32Array.from(V);
  let nvtc = vtcs.length / VERTEX_SIZE;
  this.draw = () => {
    if (this.vbo)
      CG.bindVbo(this.vbo);
    else
      this.vbo = CG.genVbo(vtcs);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, nvtc);
  }
}

CG.Mesh = function(M, N, uvToShape, arg) {
  let V = [];
  let addVertex = (...ws) => {
    for (let w of ws)
      for (let i = 0 ; i < w.length; i++)
        V.push(w[i]);
  }
  let m = 1 / (M - 1);
  let n = 1 / (N - 1);
  addVertex(uvToShape(1, 0, arg));
  for (let r = 0; r + 1 < N; ++r) {
    if (r & 1) {
      addVertex(uvToShape(0, (r + 1) * n, arg));
      for (let c = 1; c < M; ++c)
        addVertex(uvToShape(c * m, r * n, arg), uvToShape(c * m, (r + 1) * n, arg));
    }
    else {
      addVertex(uvToShape(1, (r + 1) * n, arg));
      for (let c = M - 1; c--; )
        addVertex(uvToShape(c * m, r * n, arg), uvToShape(c * m, (r + 1) * n, arg));
    }
  }
  let vtcs = Float32Array.from(V);
  let nvtc = vtcs.length / VERTEX_SIZE;
  this.draw = () => {
    if (this.vbo)
      CG.bindVbo(this.vbo);
    else
      this.vbo = CG.genVbo(vtcs);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, nvtc);
  }
}

CG.uvToPlane = (u, v) => [u, v, 0, 0, 0, 1, 1, 0, 0, u, v];

CG.uvToSphere = (u, v) => {
  let t = 2 * Math.PI * u;
  let p = Math.PI * (v - .5);
  let x = Math.cos(t) * Math.cos(p);
  let y = Math.sin(t) * Math.cos(p);
  let z = Math.sin(p);
  return [x, y, z, x, y, z, -Math.sin(t), Math.cos(t), 0, u, v];
}

CG.uvToTorus = (r) => (u, v) => {
  let t = 2 * Math.PI * u;
  let p = 2 * Math.PI * v;
  let x = Math.cos(t) * (1 + r * Math.cos(p));
  let y = Math.sin(t) * (1 + r * Math.cos(p));
  let z = r * Math.sin(p);
  let nx = Math.cos(t) * Math.cos(p);
  let ny = Math.sin(t) * Math.cos(p);
  let nz = Math.sin(p);
  return [x, y, z, nx, ny, nz, -Math.sin(t), Math.cos(t), 0, u, v];
}

CG.uvToTube = (u, v) => {
  let t = 2 * Math.PI * u;
  let x = Math.cos(t);
  let y = Math.sin(t);
  let z = 2 * v - 1;
  return [x, y, z, x, y, 0, -y, x, 0, u, v];
}

CG.uvToCone = (u, v) => {
  let t = 2 * Math.PI * u;
  let c = Math.cos(t);
  let s = Math.sin(t);
  let z = 2 * v - 1;
  let n = CG.normalize([c, s, .5]);
  return [c * (1 - v), s * (1 - v), z, n[0], n[1], n[2], -s, c, 0, u, v];
}

CG.uvToCylinder = (N) => (u, v) => {
  let t = 2 * Math.PI * u;
  let x = Math.cos(t);
  let y = Math.sin(t);
  let z = Math.max(-1, Math.min(1, (2 * v - 1) * (N - 1) / (N - 5)));
  switch (Math.floor((N - 1 + 1e-4) * v)) {
  case 0: case N - 1: return [0, 0, z, 0, 0, z, -y, x, 0, u, v];
  case 1: case N - 2: return [x, y, z, 0, 0, z, -y, x, 0, u, v];
  }
  return [x, y, z, x, y, 0, -y, x, 0, u, v];
}

CG.uvToVertex = (u,v,A,f) => {
  let e = .001, P = f(u-e, v-e, A), Q = f(u+e, v-e, A),
                R = f(u-e, v+e, A), S = f(u+e, v+e, A),
                T = CG.subtract(CG.add(Q,S), CG.add(P,R)),
                U = CG.subtract(CG.add(R,S), CG.add(P,Q)),
                N = CG.cross(T, U);
  return P.concat(CG.normalize(N))
          .concat(CG.normalize(T))
          .concat([u,v]);
}

CG.uvToLathe = (u,v,C) => CG.uvToVertex(u,v,C, (u,v,C) => {
  let z = CG.evalCubicSpline(C[0], v),
      r = CG.evalCubicSpline(C[1], v);
  return [r * Math.cos(2*Math.PI*u), r * Math.sin(2*Math.PI*u), z];
});

CG.cube     = new CG.Cube();
CG.disk     = new CG.Disk(32);
CG.plane    = new CG.Mesh(2, 2, CG.uvToPlane);
CG.sphere   = new CG.Mesh(32, 16, CG.uvToSphere);
CG.torus    = new CG.Mesh(32, 16, CG.uvToTorus(.3));
CG.torus1   = new CG.Mesh(32, 16, CG.uvToTorus(.1));
CG.tube     = new CG.Mesh(32, 2, CG.uvToTube);
CG.cone     = new CG.Mesh(32, 2, CG.uvToCone);
CG.cylinder = new CG.Mesh(32, 6, CG.uvToCylinder(6));
