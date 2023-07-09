struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

@group(0) @binding(1) var image_sampler: sampler;
@group(1) @binding(0) var dye_texture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var c = textureSample(dye_texture, image_sampler, input.v_uv).rgb;
  var a: f32 = max(c.r, max(c.g, c.b));
  return vec4<f32>(c, a);
}


