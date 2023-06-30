struct AdvectionUniforms {
  velocity_texture: texture_2d<f32>,
  source_texture: texture_2d<f32>,
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



@group(1) @binding(7) var<uniform> advection_uniforms: AdvectionUniforms

@fragment
fn advectionFragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  /*
  #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
    #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
  */

  var coord: vec2<f32> = input.v_uv - dt * textureSample(
    advection_uniforms.velocity_texture,
    fragmentUniforms.imageSampler,
    input.v_uv
  ).xy * advection_uniforms.texel_size;
  var result = textureSample(
    advection_uniforms.source_texture,
    fragmentUniforms.imageSampler,
    coord
  );

  var decay: f32 = 1.0 + advection_uniforms.dissipation * advection_uniforms.dt;
  return result / decay;
}