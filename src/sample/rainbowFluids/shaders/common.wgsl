

struct VertexUniforms {
  texelSize: vec2f;
}

struct FragmentUniforms {
  imageTexture: texture_2d<f32>,
  imageSampler: sampler,
}

@group(0) @binding(0) var<uniform> vertexUniforms: VertexUniforms;
@group(0) @binding(1) var<uniform> fragmentUniforms: FragmentUniforms;


struct VertexBlurOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2f<32>,
}