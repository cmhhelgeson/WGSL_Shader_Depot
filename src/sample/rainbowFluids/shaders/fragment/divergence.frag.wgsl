struct DivergenceUniforms {
  velocity_texture: texture_2d<f32>
}

@group(1) @binding(8) var<uniform> divergenceUniforms: DivergenceUniforms

@fragment
fn divergenceFragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var L: f32 = textureSample(velocity_texture, fragmentUniforms.sampler, input.vL).x;
  var R: f32 = textureSample(velocity_texture, fragmentUniforms.sampler, input.vR).x;
  var T: f32 = textureSample(velocity_texture, fragmentUniforms.sampler, input.vT).y;
  var B: f32 = textureSample(velocity_texture, fragmentUniforms.sampler, input.vB).y;

  var c: vec2<f32> = textureSample(velocity_texture.v_uv).xy;
  L = select(L, -C.x, input.vL.x < 0.0);
  R = select(R, -C.x, input.vR.x > 1.0);
  T = select(T, -C.y, input.vT.y > 1.0);
  B = select(B, -C.y, input.vB.y < 0.0);

  let div: f32 = 0.5 * (R - L + T - B);
  return vec4<f32>(div, 0.0, 0.0, 1.0);
}