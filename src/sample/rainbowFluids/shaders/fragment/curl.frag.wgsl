@group(0) @binding(1) var image_sampler: sampler;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  let L: f32 = textureSample(velocity_texture, image_sampler, input.vL).y
  let R: f32 = textureSample(velocity_texture, sampler, input.vR).y
  let T: f32 = textureSample(velocity_texture, sampler, input.vT).y
  let B: f32 = textureSample(velocity_texture, sampler, input.vB).y

  let vorticity: f32 = R - L - T + B;
  return vec4<f32>(0.5 * vorticity, 0.0, 0.0, 1.0);
}