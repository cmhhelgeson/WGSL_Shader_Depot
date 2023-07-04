
@group(1) @binding(0) var pressure_texture: texture_2d<f32>;
@group(1) @binding(1) var prev_velocity_texture: texture_2d<f32>

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var L: f32 = textureSample(
    gradient_subtract_uniforms.pressure_texture,
    fragmentUniforms.imageSampler,
    input.vL
  ).x;
  var R: f32 = textureSample(
    gradient_subtract_uniforms.pressure_texture,
    fragmentUniforms.imageSampler,
    input.vR
  ).x;
  var T: f32 = textureSample(
    gradient_subtract_uniforms.pressure_texture,
    fragmentUniforms.imageSampler,
    input.vT
  ).x;
  var B: f32 = textureSample(
    gradient_subtract_uniforms.pressure_texture,
    fragmentUniforms.imageSampler,
    input.vB
  ).x;

  var velocity = textureSample(
    gradient_subtract_uniforms.velocity_texture,
    fragmentUniforms.imageSampler,
    input.v_uv
  ).xy;

  velocity.xy -= vec2f(R - L, T - B);
  return vec4<f32>(velocity, 0.0, 1.0);
}
