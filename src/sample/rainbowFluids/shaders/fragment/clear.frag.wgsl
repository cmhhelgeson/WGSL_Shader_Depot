@group(1) @binding(0) var<uniform> clearValue: f32;

@fragment
fn fragmentMain(input: VertexBlurOutput) -> @location(0) vec4<f32> {
  return value * textureSample(
    fragmentUniforms.imageTexture, 
    fragmentUniforms.imageSampler,
    input.v_uv
  );
}