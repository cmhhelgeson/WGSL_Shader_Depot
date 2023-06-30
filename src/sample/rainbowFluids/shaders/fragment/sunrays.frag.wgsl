struct SunraysUniforms {
  weight: f32;
}

let ITERATIONS: u32 = 16;

@group(1) @binding(5) var<uniform> sunraysUniforms: SunraysUniforms;

@fragment
fn sunraysFragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
  //Density:  0.3
  //Decay:    0.95
  //Exposure: 0.7

  var coord: vec2<f32> = input.v_uv;
  var dir: vec2<f32> = input.v_uv - 0.5;
  
  dir *= 1.0 / f32(ITERATIONS) * 0.3;
  var illuminationDecay: f32 = 1.0;

  var color: f32 = textureSample(
    fragmentUniforms.imageTexture,
    fragmentUniforms.imageSampler,
    input.v_uv,
  ).a;

  for (var i: u32 = 0; i < ITERATIONS; i++) {
    coord -= dir;
    var col: f32 = textureSample(
      fragmentUniforms.imageTexture,
      fragmentUniforms.imageSampler,
      coord,
    );
    color += col * illuminationDecay * sunraysUniforms.weight;
    illuminationDecay *= 0.95;
  }

  return vec4<f32>(color * 0.7, 0.0, 0.0, 1.0);
}