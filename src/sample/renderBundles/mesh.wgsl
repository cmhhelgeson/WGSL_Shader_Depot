struct Uniforms {
  viewProjectionMatrix : mat4x4f,
}

fn inverseLerp(
  val: f32,
  minVal: f32,
  maxVal: f32
) -> f32 {
  return (val - minVal) / (maxVal - minVal);
}

fn remap(
  val: f32,
  inMin: f32,
  inMax: f32,
  outMin: f32,
  outMax: f32,
) -> f32 {
  var t: f32 = inverseLerp(val, inMin, inMax);
  return mix(outMin, outMax, t);
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@group(1) @binding(0) var<uniform> modelMatrix : mat4x4f;
@group(1) @binding(3) var<uniform> time: f32;

struct VertexInput {
  @location(0) position : vec4f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f
}

struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) normal: vec3f,
  @location(1) uv : vec2f,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;
  var local_pos = input.position;
  var t = sin(local_pos.y * 20.0 + time * -5.0);
  t = remap(t, -1.0, 1.0, 0.0, 0.2);
  local_pos += vec4<f32>(input.normal * t, 0.0);
  output.position = uniforms.viewProjectionMatrix * modelMatrix * local_pos;
  output.normal = normalize((modelMatrix * vec4(input.normal, 0)).xyz);
  output.uv = input.uv;
  return output;
}

@group(1) @binding(1) var meshSampler: sampler;
@group(1) @binding(2) var meshTexture: texture_2d<f32>;

// Static directional lighting
const lightDir = vec3f(1, 1, 1);
const dirColor = vec3(1);
const ambientColor = vec3f(0.05);

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let textureColor = textureSample(meshTexture, meshSampler, input.uv);

  // Very simplified lighting algorithm.
  let lightColor = saturate(ambientColor + max(dot(input.normal, lightDir), 0.0) * dirColor);

  return vec4f(textureColor.rgb * lightColor, textureColor.a);
}