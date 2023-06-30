struct PressureUniforms {
  pressure_texture: texture_2d<f32>,
  divergence_texture: texture_2d<f32>,
}

@group(1) @binding(10) var<uniform> pressure_uniforms: PressureUniforms;

@fragment
fn pressureFragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var L: f32 = textureSample(
    pressure_uniforms.pressure_texture,
    fragmentUniforms.imageSampler,
    input.vL
  ).x;
  var R: f32 = textureSample(
    pressure_uniforms.pressure_texture,
    fragmentUniforms.imageSampler,
    input.vR
  ).x;
  var T: f32 = textureSample(
    pressure_uniforms.pressure_texture,
    fragmentUniforms.imageSampler,
    input.vT
  ).x;
  var B: f32 = textureSample(
    pressure_uniforms.pressure_texture,
    fragmentUniforms.imageSampler,
    input.vB
  ).x;
  var C: f32 = textureSample(
    pressure_uniforms.pressure_texture,
    fragmentUniforms.imageSampler,
    input.v_uv
  ).x;

  var divergence: f32 = textureSample(
    pressure_uniforms.divergence_texture,
    fragmentUniforms.imageSampler,
    input.v_uv
  ).x;

  var pressure: f32 = (L + R + B + T - divergence) * 0.25;
  return vec4<f32>(pressure, 0.0, 0.0, 1.0);
}