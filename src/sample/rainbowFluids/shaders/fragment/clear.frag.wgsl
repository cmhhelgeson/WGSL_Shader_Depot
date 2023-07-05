struct ClearUniforms {
  clear_value: f32,
}

struct VertexBlurOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
}

@group(0) @binding(1) var image_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: ClearUniforms;
@group(1) @binding(1) var image_texture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBlurOutput) -> @location(0) vec4<f32> {
  return uniforms.clear_value * textureSample(
    image_texture, 
    image_sampler,
    input.v_uv
  );
}