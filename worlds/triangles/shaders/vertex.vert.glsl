#version 300 es
precision highp float;

in      vec3 aPos;
out     vec3 vPos;

// matrices
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

// window resolution
uniform vec2  uResolution;
uniform float uAspect; // width / height

// cursor
uniform vec3 uCursor;

// time in seconds
uniform float uTime;


void main() {
    gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);
    vPos = aPos;

    // correct aspect ratio
    vPos.x *= uAspect;
}
