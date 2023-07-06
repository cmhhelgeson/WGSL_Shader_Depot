struct VertexUniforms {
  texelSize: vec2<f32>,
}

struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: VertexUniforms;

@vertex
fn vertexMain(
  @builtin(vertex_index) VertexIndex: u32
) -> VertexBaseOutput {
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

  var output: VertexBaseOutput;

  var v_uv = uv[input.VertexIndex];
  output.v_uv = v_uv;
  output.vL = v_uv - vec2f(uniforms.texelSize.x, 0.0);
  output.vR = v_uv + vec2f(uniforms.texelSize.x, 0.0);
  output.vT = v_uv + vec2f(0.0, uniforms.texelSize.y);
  output.vB = v_uv + vec2f(0.0, uniforms.texelSize.y);
  output.Position = vec4f(pos[VertexIndex], 0.0, 1.0);
  return output;
}