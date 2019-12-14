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

  //vec3 N = mat3(T, B, N_) * texNorm;
  vec3 N = N_;

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
  //fragColor = vec4(texNorm.z, texNorm.z, texNorm.z, 1.);
}

/*float noize(vec3 v) {
   vec4 r[2];
   const mat4 E = mat4(0.,0.,0.,0., 0.,.5,.5,0., .5,0.,.5,0., .5,.5,0.,0.);
   for (int j = 0 ; j < 2 ; j++)
   for (int i = 0 ; i < 4 ; i++) {
      vec3 p = .6 * v + E[i].xyz, C = floor(p), P = p-C-.5, A = abs(P);
      C += mod(C.x+C.y+C.z+float(j),2.) * step(max(A.yzx,A.zxy),A)*sign(P);
      vec3 D = 43758. * sin(13. * (2.1*C     + 3.2*C.xzy + 4.3*float(i)) +
                            78. * (1.2*C.yzx + 2.3*C.zxy + 3.4*float(j)));
      r[j][i] = dot(P=p-C-.5,fract(D)-.5) * pow(max(0.,1.-2.*dot(P,P)),4.);
   }
   return 6.5 * (r[0].x+r[0].y+r[0].z+r[0].w+r[1].x+r[1].y+r[1].z+r[1].w);
}

vec3 bumpTexture(vec3 normal, vec4 bump) {
   return normalize((.5-bump.x) * normalize(vTan) + (.5-bump.y) * normalize(vBin) + (.5-bump.z) * normal);
}

vec3 phong(vec3 Ldir, vec3 Lrgb, vec3 normal, vec3 diffuse, vec3 specular, float p) {
    vec3 color = vec3(0.,0.,0.);
    float d = dot(Ldir, normal);
    if (d > 0.)
       color += diffuse * d * Lrgb;
    vec3 R = 2. * normal * dot(Ldir, normal) - Ldir;
    float s = dot(R, normal);
    if (s > 0.)
       color += specular * pow(s, p) * Lrgb;
    return color;
}

void main() {
    vec4 texture0 = texture(uTex0, vUV * uTexScale);
    vec4 texture1 = texture(uTex1, vUV * uTexScale);
    vec4 texture2 = texture(uTex2, vUV * uTexScale);

    vec3 ambient = .1 * uColor.rgb;
    vec3 diffuse = .5 * uColor.rgb;
    vec3 specular = vec3(.4,.4,.4);
    float p = 30.;

    Ldir[0] = normalize(vec3(1.,1.,2.));
    Ldir[1] = normalize(vec3(-1.,-1.,-1.));
    Lrgb[0] = vec3(.6,.6,1.);
    Lrgb[1] = vec3(.6,.3,.1);

    vec3 normal = normalize(vNor);

    if (uBumpIndex == 0) normal = bumpTexture(normal, texture(uTex0, vUV * uBumpScale));
    if (uBumpIndex == 1) normal = bumpTexture(normal, texture(uTex1, vUV * uBumpScale));
    if (uBumpIndex == 2) normal = bumpTexture(normal, texture(uTex2, vUV * uBumpScale));

    vec3 color = ambient;
    color += phong(Ldir[0], Lrgb[0], normal, diffuse, specular, p);
    color += phong(Ldir[1], Lrgb[1], normal, diffuse, specular, p);

    //color *= .5 + .5 * noize(10. * vPos);

    fragColor = vec4(sqrt(color.rgb) * (uToon == 0. ? 1. : 0.), uColor.a);
    if (uTexIndex == 0) fragColor *= texture(uTex0, vUV * uTexScale);
    if (uTexIndex == 1) fragColor *= texture(uTex1, vUV * uTexScale);
    if (uTexIndex == 2) fragColor *= texture(uTex2, vUV * uTexScale);
}*/
