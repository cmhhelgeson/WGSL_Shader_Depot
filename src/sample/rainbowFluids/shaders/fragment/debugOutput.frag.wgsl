struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

@group(0) @binding(0) var output_to_screen: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var result: vec4<f32>;
  result = textureLoad(
    output_to_screen, 
    vec2<i32>(floor(input.Position.xy)), 
    0
  );
  return result;
}