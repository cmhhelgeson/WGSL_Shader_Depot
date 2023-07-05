struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}


@group(0) @binding(1) var image_sampler: sampler;
@group(1) @binding(0) var pressure_texture: texture_2d<f32>;
@group(1) @binding(1) var prev_velocity_texture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var L: f32 = textureSample(
    pressure_texture,
    image_sampler,
    input.vL
  ).x;
  var R: f32 = textureSample(
    pressure_texture,
    image_sampler,
    input.vR
  ).x;
  var T: f32 = textureSample(
    pressure_texture,
    image_sampler,
    input.vT
  ).x;
  var B: f32 = textureSample(
    pressure_texture,
    image_sampler,
    input.vB
  ).x;

  var velocity = textureSample(
    prev_velocity_texture,
    image_sampler,
    input.v_uv
  ).xy;

  velocity -= vec2f(R - L, T - B);
  return vec4<f32>(velocity, 0.0, 1.0);
}
