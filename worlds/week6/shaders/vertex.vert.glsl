#version 300 es
precision highp float;

// INSTRUCTIONS TO VIEWER:
//
// Keyboard Input: up,down = forward/backaward, left,right = rotate
// control to "pick up and put down" the object
//
// Hold shift + up/down to move vertically
// to spawn a ring of objects
// Press "Hide" while playing to hide the code
//

layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNor;
layout (location = 2) in vec2 aUV;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
uniform float uTime;

uniform vec2 uResolution;

out vec2 vUV;
out vec2 vUV2;
out vec3 vPos;
out vec3 vWorld;
out vec3 vView;
//

out vec3 vNor;

float sin01(float v) {
    return (1.0 + sin(v)) / 2.0;
}

#define PI 3.1415926535897932384626433832795

// Note, in practice it would make more sense to send a constant/uniform
// to the GPU with the pre-computed cos/sin values to avoid calculating the
// same value for every vertex
vec2 rotate_2D_point_around(const vec2 pt, const vec2 origin, const float angle) {
  // subtract the origin
  float x = pt.x - origin.x;
  float y = pt.y - origin.y;

  float cs = cos(angle);
  float sn = sin(angle);

  // rotate and re-add the origin
  return vec2(
    (x*cs) - (y*sn),
    (y*cs) + (x*sn)
  ) + origin;
}

void main() {
  // Multiply the position by the matrix.
  gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);
  
  vNor = (transpose(inverse(uView * uModel)) * vec4(aNor, 0.)).xyz;
  // Pass the texcoord to the fragment shader.
  vUV = aUV;

  // re-add the origin
  vUV2 = rotate_2D_point_around(aUV, vec2(0.5), uTime);

  vPos = gl_Position.xyz;
  vWorld = (uModel * vec4(aPos, 1.0)).xyz;
  vView = (uView * uModel * vec4(aPos, 1.0)).xyz;
}
            