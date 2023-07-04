@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var sum: vec4f = vec4f(0.0);
  sum += textureSample(
    fragmentUniforms.imageTexture, fragmentUniforms.textureSample, input.vL
  );
  sum += textureSample(
    fragmentUniforms.imageTexture, fragmentUniforms.textureSample, input.vR
  );
  sum += textureSample(
    fragmentUniforms.imageTexture, fragmentUniforms.textureSample, input.vT
  );
  sum += textureSample(
    fragmentUniforms.imageTexture, fragmentUniforms.textureSample, input.vB
  );
  sum *= 0.25;
  return sum;
}