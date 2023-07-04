struct AdvectionUniforms {
  texel_size: vec2<f32>,
  dye_texel_size: vec2<f32>,
  dt: f32,
  dissipation: f32,
}

fn bilerp(
  texture: texture_2d<f32>,
  sampler: sampler,
  uv: vec2<f32>,
  tsize: vec2<f32>,
) -> vec4<f32> {
  var st = uv / tsize - 0.5;
  var iuv = floor(st);
  var fuv = fract(st);
  var a = textureSample(
    texture, 
    sampler, 
    (iuv + vec2<f32>(0.5, 0.5)) * tsize
  );
  var b = textureSample(
    texture, 
    sampler, 
    (iuv + vec2<f32>(1.5, 0.5)) * tsize
  );
  var c = textureSample(
    texture, 
    sampler, 
    (iuv + vec2<f32>(0.5, 1.5)) * tsize
  );
  var d = textureSample(
    texture, 
    sampler, 
    (iuv + vec2<f32>(1.5, 1.5)) * tsize
  );

  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}


@group(0) @binding(1) var image_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: AdvectionUniforms
@group(1) @binding(1) var prev_velocity_texture: texture_2d<f32>;
@group(1) @binding(2) var source_texture: texture_2d<f32>

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  var coord: vec2<f32> = input.v_uv - dt * textureSample(
    prev_velocity_texture,
    image_sampler,
    input.v_uv
  ).xy * uniforms.texel_size;
  var result = textureSample(
    source_texture,
    image_sampler,
    coord
  );

  var decay: f32 = 1.0 + .dissipation * uniforms.dt;
  return result / decay;
}