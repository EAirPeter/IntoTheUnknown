#version 300 es
precision highp float;

// input vertex
in  vec3 aPos;
in  vec3 aNor;
in  vec3 aTan;
in  vec2 aUV;

// interpolated vertex
out vec3 vPos;
out vec3 vNor;
out vec3 vTan;
out vec3 vBin;
out vec2 vUV;

// interpolated cursor
out vec3 vCursor;

out vec2 vXY;

// matrices
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

uniform float uTime; // time in seconds
uniform float uToon; // control toon shading

void main(void) {
  vec4 pos = uProj * uView * uModel * vec4(aPos, 1.);
  vXY = pos.xy / pos.z;
  mat3 m = transpose(inverse(mat3(uModel)));
  vPos = (uModel * vec4(aPos, 1.)).xyz;
  vNor = m * aNor;
  vTan = m * aTan;
  vBin = cross(vNor, vTan);
  vUV = aUV * vec2(1.,-1.) + vec2(0.,1.);
  gl_Position = pos + uToon * vec4(normalize(vNor).xy, 0.,0.);
}
