@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.projMatrix * uniforms.viewMatrix * uniforms.modelMatrix * input.position;
  return output;
}

@fragment(input: VertexOutput) -> @location(0) vec4f {
  //Calculate light and view directions in tangent space for each fragment
  return vec4f(255.0, 255.0, 255.0, 1.0);
}