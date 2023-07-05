@fragment
fn fragmentMain(input: VertexBlurOutput) -> @location(0) vec4<f32> {
  return textureSample(
    fragmentUniforms.imageTexture, 
    fragmentUniforms.imageSampler
    input.v_uv
  );
}