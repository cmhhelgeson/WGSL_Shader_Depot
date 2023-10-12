
@group(0) @binding(0) var<uniform> spaceUniforms: SpaceUniforms;
@group(0) @binding(1) var<uniform> lineUniforms: LineUniforms;
@group(0) @binding(2) var<storage, read> vertices: array<f32>;
@group(0) @binding(3) var<storage, read> indices: array<u32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);

  var triangleIndex = input.VertexIndex / 6u;
  var localVertexIndex = input.VertexIndex % 6u;

  var elementIndexIndex = 3u * triangleIndex * localToElement[localVertexIndex];
  var elementIndex = indices[elementIndexIndex];

  var position = vec4<f32>(
    vertices[3u * elementIndex + 0u],
    vertices[3u * elementIndex + 1u],
    vertices[3u * elementIndex + 2u],
    1.0,
  );


  var output : VertexOutput;
  output.Position = spaceUniforms.projMat * spaceUniforms.viewMat * spaceUniforms.modelMat * input.position;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  //Calculate light and view directions in tangent space for each fragment
  return vec4f(44.0, 255.0, 255.0, 1.0);
}