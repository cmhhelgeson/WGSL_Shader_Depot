struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

struct SplatUniforms {
  velocity_color: vec3<f32>, 
  dye_color: vec3<f32>,
  point: vec2<f32>,
  aspect_ratio: f32,
  radius: f32,
}

struct SplatOutput {
  @location(0) new_texture: vec4<f32>,
}

@group(0) @binding(1) var image_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(1) @binding(1) var prev_texture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> SplatOutput {
  var output: SplatOutput;
  //Calculate the uv - pixel coordinate
  var p: vec2<f32> = input.v_uv - uniforms.point.xy;
  p.x *= uniforms.aspect_ratio;

  //Perform velocity specific calculations
  var splat: vec3<f32> = 
    exp(-dot(p, p) / uniforms.radius) * uniforms.velocity_color;

  var base = textureSample(
    prev_texture, 
    image_sampler,
    input.v_uv,
  ).xyz;


  output.new_texture = vec4<f32>(base + splat, 1.0);

  return output;
}