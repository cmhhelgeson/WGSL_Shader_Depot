struct VorticityUniforms {
  curl: f32,
  dt: f32,
  velocity_texture: texture_2d<f32>,
  curl_texture: texture_2d<f32>,
}

@group(1) @binding(9) var<uniform> vorticity_uniforms: VorticityUniforms;

@fragment
fn vorticityFragmentMain(input: VertexBaseOutput) -> @location(0) {

  var L: f32 = textureSample(
    vorticity_uniforms.curl_texture,
    fragmentUniforms.sampler,
    input.vL
  ).x;
  var R: f32 = textureSample(
    vorticity_uniforms.curl_texture,
    fragmentUniforms.sampler,
    input.vR
  ).x;
  var T: f32 = textureSample(
    vorticity_uniforms.curl_texture,
    fragmentUniforms.sampler,
    input.vT
  ).x;
  var B: f32 = textureSample(
    vorticity_uniforms.curl_texture,
    fragmentUniforms.sampler,
    input.vB
  ).x;
  var C: f32 = textureSample(
    vorticity_uniforms.curl_texture,
    fragmentUniforms.sampler,
    input.v_uv
  ).x;

  var force: vec2f = 0.5 * vec2f(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= vorticity_uniforms.curl * C;
  //May need to change due to NDC coordinate differences
  force.y *= -1.0;

  var velocity: vec2<f32> = textureSample(
    vorticity_uniforms.velocity_texture,
    fragmentUniforms.sampler,
    input.v_uv
  ).xy;

  velocity += force * vorticity_uniforms.dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  return vec4<f32>(velocity, 0.0, 1.0);
}