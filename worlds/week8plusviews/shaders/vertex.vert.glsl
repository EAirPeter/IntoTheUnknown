#version 300 es
precision highp float;

// input vertex
in  vec3 aPos;
in  vec3 aNor;
in  vec2 aUV;

// interpolated vertex
out vec3 vPos;
out vec3 vNor;
out vec2 vUV;

// interpolated cursor
out vec3 vCursor;

out vec2 vXY;

// matrices
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

// time in seconds
uniform float uTime;

void main(void) {
    vec4 pos = uProj * uView * uModel * vec4(aPos, 1.);
    gl_Position = pos;
    vXY = pos.xy / pos.z;
    vPos = aPos;
    vNor = (vec4(aNor, 0.) * inverse(uModel)).xyz;
    vUV = aUV * vec2(1.,-1.) + vec2(0.,1.);
}
