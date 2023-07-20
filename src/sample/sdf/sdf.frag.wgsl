struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

struct Uniforms {
  time: f32,
}


@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var distFromCenter: f32 = length(abs(input.v_uv - 0.5));
  var color: vec3<f32> = vec3<f32>(distFromCenter);
  return vec4<f32>(color, 1.0);
}