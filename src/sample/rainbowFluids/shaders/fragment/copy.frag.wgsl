@fragment
fn copyFragmentMain(input: VertexBlurOutput) -> @location(0) vec4<f32> {
  return textureSample(
    fragmentUniforms.imageTexture, 
    fragmentUniforms.imageSamplerm
    input.v_uv
  );
}