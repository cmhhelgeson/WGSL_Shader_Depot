@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;
  output.Position = spaceUniforms.projMat * spaceUniforms.viewMat * spaceUniforms.modelMat * input.position;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  //Calculate light and view directions in tangent space for each fragment
  return vec4f(255.0, 255.0, 255.0, 1.0);
}