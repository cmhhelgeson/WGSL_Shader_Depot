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