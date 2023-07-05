struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

@group(0) @binding(1) var image_sampler: sampler;
@group(1) @binding(0) var prev_velocity_texture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var L: f32 = textureSample(prev_velocity_texture, image_sampler, input.vL).x;
  var R: f32 = textureSample(prev_velocity_texture, image_sampler, input.vR).x;
  var T: f32 = textureSample(prev_velocity_texture, image_sampler, input.vT).y;
  var B: f32 = textureSample(prev_velocity_texture, image_sampler, input.vB).y;

  var C: vec2<f32> = textureSample(
    prev_velocity_texture, 
    image_sampler, 
    input.v_uv
  ).xy;
  L = select(L, -C.x, input.vL.x < 0.0);
  R = select(R, -C.x, input.vR.x > 1.0);
  T = select(T, -C.y, input.vT.y > 1.0);
  B = select(B, -C.y, input.vB.y < 0.0);

  let div: f32 = 0.5 * (R - L + T - B);
  return vec4<f32>(div, 0.0, 0.0, 1.0);
}