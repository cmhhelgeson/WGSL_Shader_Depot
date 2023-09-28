/* STRUCT DEFINITIONS */
struct Uniforms {
  modelMatrix: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  projMatrix: mat4x4<f32>,
}

struct VertexInput {
  @location(0) position : vec4f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f,
  @location(3) vert_tan: vec3f,
  @location(4) vert_bitan: vec3f,
}

struct VertexOutput {
  @builtin(position) Position : vec4f,
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.projMatrix * uniforms.viewMatrix * uniforms.modelMatrix * input.position;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  //Calculate light and view directions in tangent space for each fragment
  return vec4f(255.0, 255.0, 255.0, 1.0);
}