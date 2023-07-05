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
  @location(0) new_velocity_texture: vec4<f32>,
  @location(1) new_dye_texture: vec4<f32>,
}

@group(0) @binding(1) var image_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(1) @binding(1) var prev_velocity_texture: texture_2d<f32>;
@group(1) @binding(2) var prev_dye_texture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> SplatOutput {
  var output: SplatOutput;
  //Calculate the uv - pixel coordinate
  var p: vec2<f32> = input.v_uv - uniforms.point.xy;
  p.x *= uniforms.aspect_ratio;

  //Perform velocity specific calculations
  var velocity_splat: vec3<f32> = 
    exp(-dot(p, p) / uniforms.radius) * uniforms.velocity_color;

  var velocity_base = textureSample(
    prev_velocity_texture, 
    image_sampler,
    input.v_uv,
  ).xyz;


  output.new_velocity_texture = vec4<f32>(velocity_base + velocity_splat, 1.0);

  //Perform dye specific calculations
  var dye_splat: vec3<f32> = 
    exp(-dot(p, p) / uniforms.radius) * uniforms.dye_color;

  var dye_base = textureSample(
    prev_dye_texture,
    image_sampler,
    input.v_uv,
  ).xyz;


  output.new_dye_texture = vec4<f32>(dye_base + dye_splat, 1.0);
  return output;
}