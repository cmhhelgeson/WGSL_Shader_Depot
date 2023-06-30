@vertex
fn vertexMain(input: VertexInput) -> VertexBlurOutput {
  var uv = input.position * 0.5 + 0.5;
  var offset: f32 = 1.33333333;
  var vL = uv  - uniforms.texelSize * offset;
  var vR = uv + uniforms.texelSize * offset;
  output.Position = vec4f(input.position, 0.0, 1.0);
}
