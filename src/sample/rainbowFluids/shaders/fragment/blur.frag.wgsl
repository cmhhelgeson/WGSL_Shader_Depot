struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

@fragment
fn fragmentMain(input: VertexBlurOutput) -> @location(0) vec4<f32> {
  var sum: vec4f = textureSample(
    fragmentUniforms.imageTexture, 
    fragmentUniforms.imageSampler,
    input.v_uv
  ) * 0.29411764;

  sum += textureSample(
    fragmentUniforms.imageTexture, 
    fragmentUniforms.imageSampler,
    input.vL 
  ) * 0.35294117;

  sum += textureSample(
    fragmentUniforms.imageTexture, 
    fragmentUniforms.imageSampler,
    input.vR
  ) * 0.35294117;

  return sum;
}