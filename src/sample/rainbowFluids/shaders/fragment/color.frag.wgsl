@group(1) @binding(1) var<uniform> colorValue: vec4f;

@fragment
fn fragmentMain() -> @location(0) vec4<f32> {
  return colorValue;
}