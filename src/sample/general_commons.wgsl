struct VertexOutputUV {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

fn inverseLerpF32(minVal: f32, maxVal: f32, val: f32) -> f32 {
  return (val - minVal) / (maxVal - minVal);
}

fn inverseLerpVec2(minVal: vec2<f32>, maxVal: vec2<f32>, val: vec2<f32>) -> vec2<f32> {
  return (val - minVal) / (maxVal - minVal);
}