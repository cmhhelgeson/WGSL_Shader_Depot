struct VertexInput {
  @builtin(vertex_index) VertexIndex : u32,
}

struct VertexUniforms {
  texelSize: vec2<f32>,
}

struct VertexBlurOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: VertexUniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexBlurOutput {
  const pos = array(
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2(-1.0,  1.0),
  );

  //Calculates uvs with y direction up, as is the case for WebGL I believe
  const uv = array(
    pos[0] * 0.5 + 0.5,
    pos[1] * 0.5 + 0.5,
    pos[2] * 0.5 + 0.5,
    pos[3] * 0.5 + 0.5,
    pos[4] * 0.5 + 0.5,
    pos[5] * 0.5 + 0.5,
  );

  var output: VertexBlurOutput;
  var v_uv = uv[input.VertexIndex];
  var offset = 1.333333;
  output.v_uv = v_uv;
  output.vL = v_uv - uniforms.texelSize * offset;
  output.vR = v_uv + uniforms.texelSize * offset;
  output.Position = vec4f(pos[input.VertexIndex], 0.0, 1.0);
  return output;
}
