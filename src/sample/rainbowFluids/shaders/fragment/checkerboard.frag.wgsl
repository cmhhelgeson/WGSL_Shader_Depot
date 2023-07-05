struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

@group(1) @binding(2) var<uniform> aspectRatio: f32;

let scale: f32 = 25.0;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var uv: vec2f = floor(input.v_uv * scale * vec2f(aspectRatio, 1.0));
  var v: f32 = mod(uv.x + uv.y, 2.0);
  v = v * 0.1 + 0.8;
  return vec4f(vec3f(v), 1.0);
}