#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform vec3 uAmbi;     // Ambient
uniform vec3 uDiff;     // Diffuse
uniform vec4 uSpec;     // Specular, Power

uniform vec3  uCursor;  // CURSOR: xy=pos, z=mouse up/down
uniform float uTime;    // TIME, IN SECONDS
uniform mat4  uView;    // VIEW MATRIX

in vec2 vXY;            // POSITION ON IMAGE
in vec3 vPos;           // POSITION
in vec3 vNor;           // NORMAL
in vec3 vTan;           // TANGENT
in vec3 vBin;           // BINORMAL
in vec2 vUV;            // U,V

const int NL = 2;

vec3 Ldir[NL];
vec3 Lrgb[NL];

uniform float uToon;

uniform float uTexScale;

uniform sampler2D uTexDiff;
uniform sampler2D uTexSpec;
uniform sampler2D uTexNorm;
uniform sampler2D uTexOccl;

out vec4 fragColor;    // RESULT WILL GO HERE

void main() {
  if (uToon != 0.) {
    fragColor = vec4(0., 0., 0., 1.);
    return;
  }
  Ldir[0] = normalize(vec3(1.,1.,2.));
  Ldir[1] = normalize(vec3(-1.,-1.,-1.));
  Lrgb[0] = vec3(.6,.6,1.);
  Lrgb[1] = vec3(.6,.3,.1);

  vec3 N_ = normalize(vNor);
  vec3 T = normalize(vTan);
  vec3 B = normalize(vBin);
  vec3 V = normalize(uView[3].xyz - vPos);
  vec2 UV = vUV * uTexScale;

  vec3 texDiff = texture(uTexDiff, UV).rgb;
  vec3 texSpec = texture(uTexSpec, UV).rgb;
  vec3 texNorm = normalize(texture(uTexNorm, UV).rgb * 2. - 1.);
  vec3 texOccl = texture(uTexOccl, UV).rgb;

  vec3 N = mat3(T, B, N_) * texNorm;

  texDiff *= texDiff;

  vec3 diff = uDiff * texDiff;
  vec3 spec = uSpec.xyz * texSpec;

  vec3 color = uAmbi * texOccl * texDiff;

  for (int i = 0; i < NL; ++i) {
    vec3 R = reflect(-Ldir[i], N);
    vec3 d = diff * max(.0, dot(N, Ldir[i]));
    vec3 s = spec * pow(max(.0, dot(V, R)), uSpec.w);
    color += (d + s) * Lrgb[i];
  }

  fragColor = vec4(sqrt(color), 1.);
}
