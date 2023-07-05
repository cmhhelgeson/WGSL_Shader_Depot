struct VorticityUniforms {
  curl: f32,
  dt: f32,
}

struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

fn glslMax(
  velocity: vec2<f32>,
  scalar: f32,
) -> vec2<f32> {
  return vec2f(max(velocity.x, scalar), max(velocity.y, scalar));
}

fn glslMin(
  velocity: vec2<f32>,
  scalar: f32,
) -> vec2<f32> {
  return vec2f(min(velocity.x, scalar), min(velocity.y, scalar));
}


@group(0) @binding(1) var image_sampler: sampler;

@group(1) @binding(0) var<uniform> uniforms: VorticityUniforms;
@group(1) @binding(1) var prev_velocity_texture: texture_2d<f32>;
@group(1) @binding(2) var curl_texture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {

  var L: f32 = textureSample(
    curl_texture,
    image_sampler,
    input.vL
  ).x;
  var R: f32 = textureSample(
    curl_texture,
    image_sampler,
    input.vR
  ).x;
  var T: f32 = textureSample(
    curl_texture,
    image_sampler,
    input.vT
  ).x;
  var B: f32 = textureSample(
    curl_texture,
    image_sampler,
    input.vB
  ).x;
  var C: f32 = textureSample(
    curl_texture,
    image_sampler,
    input.v_uv
  ).x;

  var force: vec2f = 0.5 * vec2f(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= uniforms.curl * C;
  //May need to change due to NDC coordinate differences
  force.y *= -1.0;

  var velocity: vec2<f32> = textureSample(
    prev_velocity_texture,
    image_sampler,
    input.v_uv
  ).xy;

  velocity += force * uniforms.dt;
  velocity = glslMin(glslMax(velocity, -1000.0), 1000.0);
  return vec4<f32>(velocity, 0.0, 1.0);
}