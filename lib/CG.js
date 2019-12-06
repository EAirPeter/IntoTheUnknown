"use strict"

let CG = {};

////////////////////////////// SUPPORT FOR VECTORS

CG.add   = (a,b) => [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];
CG.cross = (a,b) => [ a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0] ];
CG.dot   = (a,b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
CG.ik = (a,b,C,D) => {
   let c = CG.dot(C,C), x = (1 + (a*a - b*b)/c) / 2, y = CG.dot(C,D)/c;
   for (let i = 0 ; i < 3 ; i++) D[i] -= y * C[i];
   y = Math.sqrt(Math.max(0,a*a - c*x*x) / CG.dot(D,D));
   for (let i = 0 ; i < 3 ; i++) D[i] = x * C[i] + y * D[i];
   return D;
}
CG.mix  = (a,b,t) => [ a[0]*(1-t) + b[0]*t, a[1]*(1-t) + b[1]*t, a[2]*(1-t) + b[2]*t ];
CG.norm = a => Math.sqrt(CG.dot(a, a));
CG.normalize = a => {
   let s = Math.sqrt(CG.dot(a,a));
   return [ a[0] / s, a[1] / s, a[2] / s ];
}
CG.scale = (a,s) => [ s*a[0], s*a[1], s*a[2] ];
CG.subtract = (a,b) => [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];
CG.abs = a => [Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[2])];
////////////////////////////// SUPPORT FOR MATRICES

CG.matrixAimZ = function(Z) {
   Z = CG.normalize(Z);
   let X0 = CG.cross([0,1,0], Z), t0 = CG.dot(X0,X0), Y0 = CG.cross(Z, X0),
       X1 = CG.cross([1,0,0], Z), t1 = CG.dot(X1,X1), Y1 = CG.cross(Z, X1),
       t = t1 / (4 * t0 + t1),
       X = CG.normalize(CG.mix(X0, X1, t)),
       Y = CG.normalize(CG.mix(Y0, Y1, t));
   return [ X[0],X[1],X[2],0, Y[0],Y[1],Y[2],0, Z[0],Z[1],Z[2],0, 0,0,0,1 ];
}
CG.matrixFromQuaternion = q => {
   var x = q[0], y = q[1], z = q[2], w = q[3];
   return [ 1 - 2 * (y * y + z * z),     2 * (z * w + x * y),     2 * (x * z - y * w), 0,
                2 * (y * x - z * w), 1 - 2 * (z * z + x * x),     2 * (x * w + y * z), 0,
                2 * (y * w + z * x),     2 * (z * y - x * w), 1 - 2 * (x * x + y * y), 0,  0,0,0,1 ];
}
CG.matrixIdentity = ()       => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
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
CG.matrixMultiply = (a, b)   => {
   let c = [];
   for (let n = 0 ; n < 16 ; n++)
      c.push( a[n&3     ] * b[    n&12] +
              a[n&3 |  4] * b[1 | n&12] +
              a[n&3 |  8] * b[2 | n&12] +
              a[n&3 | 12] * b[3 | n&12] );
   return c;
}
CG.matrixRotateX = t         => [1,0,0,0, 0,Math.cos(t),Math.sin(t),0, 0,-Math.sin(t),Math.cos(t),0, 0,0,0,1];
CG.matrixRotateY = t         => [Math.cos(t),0,-Math.sin(t),0, 0,1,0,0, Math.sin(t),0,Math.cos(t),0, 0,0,0,1];
CG.matrixRotateZ = t         => [Math.cos(t),Math.sin(t),0,0, -Math.sin(t),Math.cos(t),0,0, 0,0,1,0, 0,0,0,1];
CG.matrixScale = (x,y,z)     => [x,0,0,0, 0,y===undefined?x:y,0,0, 0,0,z===undefined?x:z,0, 0,0,0,1];
CG.matrixTransform = (m,v)   => {
   let x = v[0], y = v[1], z = v[2], w = (v[3] === undefined ? 1 : v[3]);
   return [ m[ 0] * x + m[ 4] * y + m[ 8] * z + m[12] * w,
            m[ 1] * x + m[ 5] * y + m[ 9] * z + m[13] * w,
            m[ 2] * x + m[ 6] * y + m[10] * z + m[14] * w,
            m[ 3] * x + m[ 7] * y + m[11] * z + m[15] * w ];
}
CG.matrixTranslate = (x,y,z) => 
   Array.isArray(x) ? [1,0,0,0, 0,1,0,0, 0,0,1,0, x[0],x[1],x[2],1]
                    : [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];

let Matrix = function() {
   let topIndex = 0,
       stack = [ CG.matrixIdentity() ],
       getVal = () => stack[topIndex],
       setVal = m => { stack[topIndex] = m; return this; }

   this.aimZ      = v       => setVal(CG.matrixMultiply(getVal(), CG.matrixAimZ(v)));
   this.identity  = ()      => setVal(CG.matrixIdentity());
   this.multiply  = a       => setVal(CG.matrixMultiply(getVal(), a));
   this.restore   = ()      => --topIndex;
   this.rotateQ   = q       => setVal(CG.matrixMultiply(getVal(), CG.matrixFromQuaternion(q)));
   this.rotateX   = t       => setVal(CG.matrixMultiply(getVal(), CG.matrixRotateX(t)));
   this.rotateY   = t       => setVal(CG.matrixMultiply(getVal(), CG.matrixRotateY(t)));
   this.rotateZ   = t       => setVal(CG.matrixMultiply(getVal(), CG.matrixRotateZ(t)));
   this.save      = ()      => stack[++topIndex] = stack[topIndex-1].slice();
   this.scale     = (x,y,z) => setVal(CG.matrixMultiply(getVal(), CG.matrixScale(x,y,z)));
   this.set       = a       => setVal(a);
   this.transform = v       => CG.matrixTransform(getVal(), v);
   this.translate = (x,y,z) => setVal(CG.matrixMultiply(getVal(), CG.matrixTranslate(x,y,z)));
   this.value     = ()      => getVal();
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

CG.quadData = {
   vertices : [
      -1,-1,0, 0,0,1, 1,0,0, 0,0,
       1,-1,0, 0,0,1, 1,0,0, 1,0,
      -1, 1,0, 0,0,1, 0,1,0, 1,0,
       1, 1,0, 0,0,1, 1,1,0, 1,0
   ],
   indices : [ 0,1,3, 0,3,2 ]
}

CG.createQuadVertices = () => {
   return [
      -1,-1, 1,  0, 0, 0,   1, 0, 0,  0,0,      1, 1, 1,  0, 0, 0,   1, 0, 0,  1,1,     -1, 1, 1,  0, 0, 0,   1, 0, 0,  0,1,
       1, 1, 1,  0, 0, 0,   1, 0, 0,  1,1,     -1,-1, 1,  0, 0, 0,   1, 0, 0,  0,0,      1,-1, 1,  0, 0, 0,   1, 0, 0,  1,0,
   ];
}

CG.createCubeVertices = () => {
   let V = [], P = [
      -1,-1, 1,  0, 0, 1,   1, 0, 0,  0,0,      1, 1, 1,  0, 0, 1,   1, 0, 0,  1,1,     -1, 1, 1,  0, 0, 1,   1, 0, 0,  0,1,
       1, 1, 1,  0, 0, 1,   1, 0, 0,  1,1,     -1,-1, 1,  0, 0, 1,   1, 0, 0,  0,0,      1,-1, 1,  0, 0, 1,   1, 0, 0,  1,0,

       1,-1,-1,  0, 0,-1,  -1, 0, 0,  0,0,     -1, 1,-1,  0, 0,-1,  -1, 0, 0,  1,1,      1, 1,-1,  0, 0,-1,  -1, 0, 0,  0,1,
      -1, 1,-1,  0, 0,-1,  -1, 0, 0,  1,1,      1,-1,-1,  0, 0,-1,  -1, 0, 0,  0,0,     -1,-1,-1,  0, 0,-1,  -1, 0, 0,  1,0
   ];
   for (let n = 0 ; n < 3 ; n++)
      for (let i = 0 ; i < P.length ; i += VERTEX_SIZE) {
         let p0 = [P[i   ], P[i+ 1], P[i+ 2]],
	     p1 = [P[i+ 3], P[i+ 4], P[i+ 5]],
	     p2 = [P[i+ 6], P[i+ 7], P[i+ 8]],
	     uv = [P[i+ 9], P[i+10]];
         V = V.concat(p0).concat(p1).concat(p2).concat(uv);
         for (let j = 0 ; j < 3 ; j++) {
            P[i   + j] = p0[(j+1) % 3];
            P[i+3 + j] = p1[(j+1) % 3];
            P[i+6 + j] = p2[(j+1) % 3];
         }
      }
/*
   To do: create edged cube by adding 12*2 edge triangles and 8 corner triangles.
*/
   return V;
}

CG.uvToCylinder = (u,v) => {
   let c = Math.cos(2 * Math.PI * u);
   for (let n = 0 ; n < 3 ; n++)
      for (let i = 0 ; i < P.length ; i += VERTEX_SIZE) {
         let p0 = [P[i   ], P[i+ 1], P[i+ 2]],
	     p1 = [P[i+ 3], P[i+ 4], P[i+ 5]],
	     p2 = [P[i+ 6], P[i+ 7], P[i+ 8]],
	     uv = [P[i+ 9], P[i+10]];
         V = V.concat(p0).concat(p1).concat(p2).concat(uv);
         for (let j = 0 ; j < 3 ; j++) {
            P[i   + j] = p0[(j+1) % 3];
            P[i+3 + j] = p1[(j+1) % 3];
            P[i+6 + j] = p2[(j+1) % 3];
         }
      }
   return V;
}

CG.uvToCylinder = (u,v) => {
   let c = Math.cos(2 * Math.PI * u);
   let s = Math.sin(2 * Math.PI * u);
   let z = Math.max(-1, Math.min(1, 10*v - 5));

   switch (Math.floor(5.001 * v)) {
   case 0: case 5: return [ 0,0,z, 0,0,z, -s,c,0, u,v]; // center of back/front end cap
   case 1: case 4: return [ c,s,z, 0,0,z, -s,c,0, u,v]; // perimeter of back/front end cap
   case 2: case 3: return [ c,s,z, c,s,0, -s,c,0, u,v]; // back/front of cylindrical tube
   }
}

CG.createMeshVertices = (M, N, uvToShape, vars) => {
   let vertices = [];
   for (let row = 0 ; row < N-1 ; row++)
      for (let col = 0 ; col < M ; col++) {
         let u = (row & 1 ? col : M-1 - col) / (M-1);
         if (col != 0 || row == 0)
         vertices = vertices.concat(uvToShape(u,  row    / (N-1), vars));
         vertices = vertices.concat(uvToShape(u, (row+1) / (N-1), vars));
      }
   return vertices;
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

CG.uvToSphere = (u,v) => CG.uvToVertex(u,v,null, (u,v) => {
   let t = 2 * Math.PI * u,
       p = Math.PI * (v - .5);
   return [ Math.cos(t) * Math.cos(p) ,
            Math.sin(t) * Math.cos(p) ,
                          Math.sin(p) ];
});

CG.uvToTorus = (u,v,r) => CG.uvToVertex(u,v,r, (u,v,r) => {
   let t = 2 * Math.PI * u,
       p = 2 * Math.PI * v;
   return [ Math.cos(t) * (1 + r * Math.cos(p)),
            Math.sin(t) * (1 + r * Math.cos(p)),
            r * Math.sin(p) ];
});

CG.uvToLathe = (u,v,C) => CG.uvToVertex(u,v,C, (u,v,C) => {
   let z = CG.evalCubicSpline(C[0], v),
       r = CG.evalCubicSpline(C[1], v);
   return [ r * Math.cos(2*Math.PI*u), r * Math.sin(2*Math.PI*u), z ];
});

CG.cube     = CG.createCubeVertices();
CG.quad     = CG.createQuadVertices();
CG.sphere   = CG.createMeshVertices(32, 16, CG.uvToSphere);
CG.cylinder = CG.createMeshVertices(32,  6, CG.uvToCylinder);
CG.torus    = CG.createMeshVertices(32, 16, CG.uvToTorus, 0.3);
CG.torus1   = CG.createMeshVertices(32, 16, CG.uvToTorus, 0.1);

