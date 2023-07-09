struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vLeft: vec2<f32>,
  @location(2) vRight: vec2<f32>,
  @location(3) vTop: vec2<f32>,
  @location(4) vBottom: vec2<f32>,
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
@group(1) @binding(3) var prev_pressure_texture: texture_2d<f32>



//Velocity 0 -> SplatOutput
//Dye 0 -> SplatOutput
//Curl 0 -> CurlOutput
//Velocity 1 -> Vorticity Output

@fragment
fn fragmentMain(input: VertexBaseOutput) -> SplatOutput {
  //Create outputs for each shader stage
  var velocity_0_splat_output: vec4<f32>;
  var dye_0_splat_output: vec4<f32>;
  var curl_0_curl_output: vec4<f32>;
  var velocity_1_vorticity_output: vec4<f32>;
  var divergence_0_divergence_output: vec4<f32>;
  var pressure_0_clear_output: vec4<f32>;
  var pressure_n_pressure_output: vec4<f32>;
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