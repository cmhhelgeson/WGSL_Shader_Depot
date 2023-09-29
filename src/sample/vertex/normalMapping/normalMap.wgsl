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
  lightPosX: f32,
  lightPosY: f32,
  lightPosZ: f32,
  lightIntensity: f32,
}

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
  @location(2) posWS: vec3f,
  @location(3) posTS: vec3f,
  @location(4) viewTS: vec3f,
  @location(5) tbnTS0: vec3<f32>, 
  @location(6) tbnTS1: vec3<f32>,
  @location(7) tbnTS2: vec3<f32>,
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
const lightPos = vec3f(0.0, 0.0, 2.0);
const viewPos = vec3f(0.0, 0.0, -2.0);

/* VERTEX SHADER */
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<uniform> mapInfo: Uniforms_MapInfo;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;

  //Get Clip space transform out of the way
  output.Position = uniforms.projMatrix * uniforms.viewMatrix * uniforms.modelMatrix * input.position;
  output.uv = input.uv;
  output.normal = input.normal;
  //Multiply pos by modelMatrix to get frag pos in world space
  output.posWS = vec3f((uniforms.modelMatrix * input.position).xyz);
  
  //Get the model view matrix
  var MV = uniforms.viewMatrix * uniforms.modelMatrix;
  var MV3x3 = mat3x3f(
    MV[0].xyz,
    MV[1].xyz,
    MV[2].xyz
  );
  //Get unit vectors of normal, tangent, and bitangents in model space
  var vertexTangent: vec3f = normalize(input.vert_tan);
  var vertexBitangent: vec3f = normalize(input.vert_bitan);
  var vertexNormal: vec3f = normalize(input.normal);

  //Convert tbn unit vectors to mv space for a model view tbn
  var tbnTS = transpose3x3(
    MV3x3 * mat3x3f(
      vertexTangent,
      vertexBitangent,
      vertexNormal
    )
  );
  output.tbnTS0 = tbnTS[0];
  output.tbnTS1 = tbnTS[1];
  output.tbnTS2 = tbnTS[2];

  //Get the tangent space position of the vertex
  output.posTS = tbnTS * (MV * input.position).xyz;

  //Do we need to multipy by viewPos?
  output.viewTS = tbnTS * vec3f(0.0, 0.0, 0.0)

  return output;
}

/* FRAGMENT SHADER */

@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var diffuseTexture: texture_2d<f32>;
@group(1) @binding(2) var normalTexture: texture_2d<f32>;
@group(1) @binding(3) var depthTexture: texture_2d<f32>;


@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  //Reconstruct tbnTS
  var tbnTS = mat3x3f(
    input.tbnTS0,
    input.tbnTS1,
    input.tbnTS2,
  );
  //Get values from textures
  let diffuseMap = textureSample(diffuseTexture, textureSampler, input.uv);
  let normalMap = textureSample(normalTexture, textureSampler, input.uv);
  let depthMap = textureSample(depthTexture, textureSampler, input.uv); 

  //Get position, direction, and distance of light in tangent space (no need to multiply by model matrix as there is no model)
  var lightPosVS: vec4f = uniforms.viewMatrix * vec4f(mapInfo.lightPosX, mapInfo.lightPosY, mapInfo.lightPosZ, 1.0);
  var lightPosTS: vec3f = tbnTS * lightPosVS.xyz;
  var lightDirTS: vec3f = normalize(lightPosTS - input.posTS);
  var lightDistanceTS = distance(input.posTS, lightPosTS);

  //Get normal in tangent space
  var normalTS = normalize((normalMap.xyz * 2.0) - 1.0);
  
  //Calculate diffusion lighting
  var lightColorIntensity = vec3f(255.0, 255.0, 255.0) * mapInfo.lightIntensity;
  //How similar is the normal to the lightDirection
  var diffuseStrength = clamp(
    dot(normalTS, lightDirTS), 0.0, 1.0
  );
  //Strenght inversely proportional to square of distance from light
  var diffuseLight = (lightColorIntensity * diffuseStrength) / (lightDistanceTS * lightDistanceTS);

  //Calculate light and view directions in tangent space for each fragment
  /*var lightDir = normalize(input.tangentSpaceLightPos - input.tangentSpaceFragPos);
  var viewDir = normalize(input.tangentSpaceViewPos - input.tangentSpaceFragPos);

  let uv = select(parallax_uv(
    input.uv, 
    viewDir,
    textureSample(depthTexture, textureSampler, input.uv).b,
    mapInfo.parallax_scale,
  ), vec2f(input.uv.x, 1 - input.uv.y), mapInfo.mappingType < 2);

  //Obtain the normal of the fragment in [-1, 1] range
  var fragmentNormal = (normalMap.rgb * 2.0 - 1.0);
  //DIFFUSE
  var diffuseColor = diffuseMap.rgb;
  var diffuseLight = max(
    dot(
      lightDir, 
      select(fragmentNormal, input.posWS, mapInfo.mappingType <= 0)
    ), 0.0
  ) * diffuseColor;
  //AMBIENT
  var ambientLight = 0.1 * diffuseColor; */

  return vec4f(diffuseMap.rgb * diffuseLight, 1.0);
}