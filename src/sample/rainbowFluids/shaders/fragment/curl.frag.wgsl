struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

@group(0) @binding(1) var image_sampler: sampler;
@group(1) @binding(0) var velocity_texture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  let L: f32 = textureSample(velocity_texture, image_sampler, input.vL).y;
  let R: f32 = textureSample(velocity_texture, image_sampler, input.vR).y;
  let T: f32 = textureSample(velocity_texture, image_sampler, input.vT).y;
  let B: f32 = textureSample(velocity_texture, image_sampler, input.vB).y;

  let vorticity: f32 = R - L - T + B;
  return vec4<f32>(0.5 * vorticity, 0.0, 0.0, 1.0);
}