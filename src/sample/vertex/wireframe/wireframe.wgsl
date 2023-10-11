struct Vertex {
  x: f32,
  y: f32,
  z: f32,
}

@group(0) @binding(0) var<uniform> spaceUniforms: SpaceUniforms;
@group(0) @binding(1) var<uniform> lineUniforms: LineUniforms;
@group(0) @binding(2) var<storage, read> vertices: array<Vertex>;
@group(0) @binding(3) var<storage, read> indices: array<u32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var triangleIndex = input.VertexIndex / 6u;
  var localVertexIndex = input.VertexIndex % 6u;

  var elementIndexIndex = input.VertexIndex;


  var output : VertexOutput;
  output.Position = spaceUniforms.projMat * spaceUniforms.viewMat * spaceUniforms.modelMat * input.position;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  //Calculate light and view directions in tangent space for each fragment
  return vec4f(44.0, 255.0, 255.0, 1.0);
}