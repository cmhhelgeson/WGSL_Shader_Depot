struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

@group(0) @binding(1) var image_sampler: sampler;

@group(1) @binding(0) var divergence_texture: texture_2d<f32>;
@group(1) @binding(1) var pressure_texture: texture_2d<f32>;

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
  var C: f32 = textureSample(
    pressure_texture,
    image_sampler,
    input.v_uv
  ).x;

  var divergence: f32 = textureSample(
    divergence_texture,
    image_sampler,
    input.v_uv
  ).x;

  var pressure: f32 = (L + R + B + T - divergence) * 0.25;
  return vec4<f32>(pressure, 0.0, 0.0, 1.0);
}