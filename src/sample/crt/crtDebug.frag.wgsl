struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

struct Uniforms {
  time: f32,
  debugStep: f32,
}

fn inverseLerp(val: f32, minVal: f32, maxVal: f32) -> f32 {
  return (val - minVal) / (maxVal - minVal);
}

fn remap(
  val: f32,
  inputMin: f32,
  inputMax: f32,
  outputMin: f32,
  outputMax: f32,
) -> f32 {
  var t: f32 = inverseLerp(val, inputMin, inputMax);
  return mix(outputMin, outputMax, t);
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var image_sampler: sampler;
@group(0) @binding(2) var diffuse: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let beforeScale = sin(input.v_uv.y);
  let t1BeforeTimeOffset = sin(input.v_uv.y * 400.0);
  let t1BeforeRemap = sin(input.v_uv.y * 400.0 + uniforms.time * 10.0);
  let t1 = remap(
    sin(input.v_uv.y * 400.0 + uniforms.time * 10.0),
    -1.0,
    1.0,
    0.9,
    1.0
  );

  let t2BeforeTimeOffset = sin(input.v_uv.y * 200.0);
  let t2BeforeRemap = sin(input.v_uv.y * 200.0 - uniforms.time * 20.0);
  
  let t2 = remap(
    sin(input.v_uv.y * 200.0 - uniforms.time * 20.0),
    -1.0,
    1.0,
    0.95,
    1.0
  );
  
  

  if (uniforms.debugStep == 0) {
    var color = vec3<f32>(beforeScale);
    return vec4<f32>(color, 1.0);
  }
  if (uniforms.debugStep == 1) {
    var color = vec3<f32>(t1BeforeTimeOffset);
    return vec4<f32>(color, 1.0);
  }
  if (uniforms.debugStep == 2) {
    var color = vec3<f32>(t1BeforeRemap);
    return vec4<f32>(color, 1.0);
  }
  if (uniforms.debugStep == 3) {
    var color = vec3<f32>(t2BeforeRemap);
    return vec4<f32>(color, 1.0);
  }
  if (uniforms.debugStep == 4) {
    var color = vec3<f32>(t2);
    return vec4<f32>(color, 1.0);
  }

  var color = textureSample(
    diffuse,
    image_sampler,
    input.v_uv
  ).xyz * t1 * t2;

  return vec4<f32>(color, 1.0);
}