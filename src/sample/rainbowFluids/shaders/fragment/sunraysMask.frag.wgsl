@fragment
fn sunraysMaskFragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var c: vec4<f32> = textureSample(
    fragmentUniforms.imageTexture,
    fragmentUniforms.imageSampler,
    input.v_uv
  );

  var br: f32 = max(c.r, max(c.g, c.b));
  c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
  return c;
}