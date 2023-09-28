/* STRUCT DEFINITIONS */
struct Uniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  normalMatrix: mat4x4f,
  modelMatrix: mat4x4f,
}

struct Uniforms_MapInfo {
  mappingType: u32,
  parallax_scale: f32,
}

//CS: Cameraspace
//MS/WS: Worldspace
//NDC: Clipspace
//TS: Tangentspace

struct VertexInput {
  //Shader assumes the missing 4th float is 1.0
  @location(0) position : vec4f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f,
  @location(3) vert_tan: vec3f,
  @location(4) vert_bitan: vec3f,
}

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) normal: vec3f,
  @location(1) uv : vec2f,
  @location(2) vertPosWS: vec3f,
  @location(3) vertToCamCS: vec3f,
  @location(4) vertToLightCS: vec3f,
  @location(5) vertToCamTS: vec3f,
  @location(6) vertToLightTS: vec3f,
}

/* UTILITY FUNCTIONS */

fn transpose3x3(mat: mat3x3f) -> mat3x3f  {
  return mat3x3f(
    mat[0][0], mat[1][0], mat[2][0],
    mat[0][1], mat[1][1], mat[2][1],
    mat[0][2], mat[1][2], mat[2][2],
  );
}

fn parallax_uv(
  uv: vec2f, 
  view_dir: vec3f, 
  depth_value: f32,
  depth_scale: f32
) -> vec2f {
  var p: vec2f = view_dir.xy / view_dir.z * (depth_value * depth_scale);
  return uv - p;
}

fn when_greater(v1: f32, v2: f32) -> f32 {
  return max(sign(v1 - v2), 0.0);
}

/* CONST VALUES */
const lightPosWS = vec3f(1.0, 1.0, -2.0);

/* VERTEX SHADER */
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;
  //Create model-view-projection matrix and model-view matrix;
  var MVP = uniforms.projMatrix * uniforms.viewMatrix * uniforms.modelMatrix;
  var MV = uniforms.viewMatrix * uniforms.modelMatrix;

  //Get clip space position of vertex
  output.Position = MVP * input.position;
  //Get world space position of vertex
  var vertPosWS = (uniforms.modelMatrix * input.position).xyz;
  //Get camera space position of vertex
  var vertPosCS = (MV * input.position).xyz;

  //Vector from vertex to cameraOrigin (0, 0, 0) in camerspace
  var vertToCamCS = vec3f(0.0, 0.0, 0.0) - vertPosCS;
  //Camera space position of light
  var lightCS = (
    uniforms.viewMatrix * vec4f(lightPosWS, 1.0)
  ).xyz;
  //Vector from vertex to light in cameraspace
  var vertToLightCS = lightCS + vertToCamCS;

  output.uv = input.uv;
  output.normal = input.normal;

  var MV3x3 = mat3x3f(
    MV[0].xyz,
    MV[1].xyz,
    MV[2].xyz
  );

  //Get model tangents in cameraspace
  var vert_tan_cameraspace = MV3x3 * input.vert_tan;
  var vert_bitan_cameraspace = MV3x3 * input.vert_bitan;
  var vert_normal_cameraspace = MV3x3 * input.normal;

  var TBN: mat3x3f = transpose3x3(
    mat3x3f(
      vert_tan_cameraspace,
      vert_bitan_cameraspace,
      vert_normal_cameraspace
    )
  );


  var vertToCamTS = TBN * vertToCamCS;
  var vertToLightTS = TBN * vertToLightCS;

  output.vertPosWS = vertPosWS;
  output.vertToCamCS = vertToCamCS;
  output.vertToLightCS = vertToLightCS;
  output.vertToCamTS = vertToCamTS;
  output.vertToLightCS = vertToLightTS;

  return output;
}

/* FRAGMENT SHADER */
@group(0) @binding(1) var<uniform> mapInfo: Uniforms_MapInfo;
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var diffuseTexture: texture_2d<f32>;
@group(1) @binding(2) var normalTexture: texture_2d<f32>;
@group(1) @binding(3) var depthTexture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let diffuseMap = textureSample(diffuseTexture, textureSampler, uv);
  let normalMap = textureSample(normalTexture, textureSampler, uv);
  let depthMap = textureSample(depthTexture, textureSampler, uv); 
  //Transform normal to -1 to 1 space
  var fragPosTS = normalize(normalMap.rgb * 2.0 - 1.0);
  var vertToLightWS = lightPosWS - input.vertPosWS;
  
  var n: vec3f = fragPosTS;
  var l: vec3f = normalize(input.vertToLightTS);
  var e: vec3f = normalize(input.vertToCamTS);
  var r: vec3f = reflect(vec3f(-1), n);

  //How similar is the tangent space normal to the tangent space light direction
  var cosLight = clamp(dot(n, l), 0, 1);
  //Angle between viewer and reflection vector
  var cosEye = clamp(dot(e, r), 0, 1);

  //DIFFUSE
  var diffuseColor = diffuseMap.rgb;
  var diffuseLight = diffuseColor * 10.0 * cosLight / dot(vertToLightWS, vertToLightWS);
  var ambientLight = 0.1 * diffuseColor;

  //return vec4(normalMap.rgb, 1.0);
  return vec4f(ambientLight + diffuseLight, 1.0);
}