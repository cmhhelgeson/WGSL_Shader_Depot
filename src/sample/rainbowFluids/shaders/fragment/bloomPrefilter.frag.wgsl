struct BloomPrefilterUniforms {
  curve: vec3<f32>,
  threshold: f32,
}

@group(1) @binding(3) var<uniform> bloomUniforms: BloomPrefilterUniforms;

@fragment
fn bloomPrefilterFragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var c: vec3<f32> = textureSample(
    fragmentUniforms.imageTexture,
    fragmentUniforms.imageSampler,
    input.v_uv
  ).rgb;

  var br: f32 = max(c.r, max(c.g, c.b));
  var rq: f32 = clamp(br - bloomUniforms.curve.x, 0.0, bloomUniforms.curve.y);
  rq = bloomUniforms.curve.z * rq * rq;
  c *= max(rq, br - bloomUniforms.threshold) / max(br, 0.0001);
  return vec4f(c, 0.0);
}