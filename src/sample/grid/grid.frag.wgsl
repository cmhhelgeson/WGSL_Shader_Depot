struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

struct Uniforms {
  gridDimensions: f32,
  cellOriginX: f32,
  cellOriginY: f32,
  lineWidth: f32,
}

const red: vec3f = vec3f(1.0, 0.0, 0.0);
const blue = vec3f(0.0, 0.0, 1.0);
const white = vec3f(1.0, 1.0, 1.0);
const black = vec3f(0.0, 0.0, 0.0);
const yellow = vec3f(1.0, 1.0, 0.0);

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var tex_diffuse: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {

  var color = vec3f(0.75);
  var cell: vec2f = fract(input.v_uv * uniforms.gridDimensions);
  cell = vec2f(abs(cell.x - uniforms.cellOriginX - 0.5), abs(cell.y - uniforms.cellOriginY - 0.5));

  //Represent the currrent distance to the origin of the cell
  //Wherever that may be.
  //cellOrigin: 0.5 -> origin is in center
  //cellOrigin: the origin
  //lineWidth from 1.0 to 5.0 0.0 -> origin in upper left
  //cell's origin will be black

  //Scale and invert the distance from
  var scaledDist: f32 = 1.0 - (1.0 + uniforms.lineWidth) * max(cell.x, cell.y);

  //Anything even a little bit white will be scaled along the smoothstep to 1.0
  var ceilLine: f32 = smoothstep(0.0, 0.05, scaledDist);

  var xAxis: f32 = smoothstep(0.0, 0.005, abs(input.v_uv.y - 0.5));
  var yAxis: f32 = smoothstep(0.0, 0.005, abs(input.v_uv.x - 0.5));

  color = vec3f(ceilLine);
  
  return vec4f(color, 1.0);
}