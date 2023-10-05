@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  var MVP = spaceUniforms.projMat * spaceUniforms.viewMat * spaceUniforms.modelMat;
  output.Position = MVP * input.position;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  //Calculate light and view directions in tangent space for each fragment
  return vec4f(255.0, 255.0, 255.0, 1.0);
}