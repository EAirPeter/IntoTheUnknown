#version 300 es
in vec3 aPos; // attributes replaced with "in"
out       vec3 vPos; // varying output replaced with "out"
uniform   mat4 uModel;
uniform   mat4 uView;
uniform   mat4 uProj;

uniform   int uCompileCount;
uniform   float uTime;

void main() {
  float translation = /*float(uCompileCount) * */ 1.0 * uTime + (10.0 * float(uCompileCount));
  gl_Position = uProj * uView * uModel * vec4(vec3(0.25 * (aPos.x + sin(translation)), 0.25 * (aPos.y - sin(translation)), aPos.z), 1.);
  vPos = aPos;
}
