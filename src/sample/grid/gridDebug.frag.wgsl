struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

struct Uniforms {
  gridDimensions: f32,
  cellOriginX: f32,
  cellOriginY: f32,
  lineWidth: f32,
  debugStep: f32,
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
  var cellBeforeMultiply: vec2f = vec2f(input.v_uv * uniforms.gridDimensions) - vec2f(uniforms.cellOriginX, uniforms.cellOriginY);
  var cellBeforeOriginShift: vec2f = fract(input.v_uv * uniforms.gridDimensions) - vec2f(uniforms.cellOriginX, uniforms.cellOriginY);
  var cell = vec2f(abs(cellBeforeOriginShift.x - uniforms.cellOriginX - 0.5), abs(cellBeforeOriginShift.y - uniforms.cellOriginY - 0.5));

  if (uniforms.debugStep == 0) {
    return vec4<f32>(input.v_uv.x, input.v_uv.y, 0.0, 1.0);
  }

  if (uniforms.debugStep == 1) {
    return vec4<f32>(cellBeforeMultiply.x, cellBeforeMultiply.y, 0.0, 1.0);
  }
  if (uniforms.debugStep == 2) {
    return vec4<f32>(cellBeforeOriginShift.x, cellBeforeOriginShift.y, 0.0, 1.0);
  }

  if (uniforms.debugStep == 3) {
    return vec4<f32>(cell.x, cell.y, 0.0, 1.0);
  }

  //Scale and invert the distance from
  var scaledDist: f32 = 1.0 - (1.0 + uniforms.lineWidth) * max(cell.x, cell.y);
  
  if (uniforms.debugStep == 4) {
    return vec4<f32>(scaledDist, 0.0, 0.0, 1.0);
  }

  //Anything even a little bit white will be scaled along the smoothstep to 1.0
  var ceilLine: f32 = smoothstep(0.0, 0.05, scaledDist);

  color = vec3f(ceilLine);
  
  return vec4f(color, 1.0);
}