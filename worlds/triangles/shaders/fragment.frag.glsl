#version 300 es
precision highp float;

in      vec3  vPos;     // -1 < vPos.x < +1
                        // -1 < vPos.y < +1
                        //      vPos.z == 0

// fragment output color
out vec4 fragColor; 

uniform vec2  uResolution;      // window resolution
uniform vec3  uCursor;          // cursor in -1 to 1 space
uniform float uAspect;          // aspect ratio width/height
uniform float uTime;            // time, in seconds


void main() {
    fragColor = vec4(vPos, 1.0);
}