struct VertexInput {
  @builtin(vertex_index) VertexIndex : u32,
}

struct VertexUniforms {
  texelSize: vec2<f32>,
}

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vLeft: vec2<f32>,
  @location(2) vRight: vec2<f32>,
  @location(3) vTop: vec2<f32>,
  @location(4) vBottom: vec2<f32>,
  @location(5) vLeftBlur: vec2<f32>,
  @location(6) vRightBlur: vec2<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: VertexUniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexBaseOutput {
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

  var output: VertexOutput;
  var offset = 1.333333;

  //Vertex Output Vars
  var v_uv = uv[input.VertexIndex];
  output.v_uv = v_uv;
  //Base Output Vars
  output.vLeft = v_uv - vec2f(uniforms.texelSize.x, 0.0);
  output.vRight = v_uv + vec2f(uniforms.texelSize.x, 0.0);
  output.vTop = v_uv + vec2f(0.0, uniforms.texelSize.y);
  output.vBottom = v_uv + vec2f(0.0, uniforms.texelSize.y);
  //Blur Output Vars
  output.vLeftBlur = v_uv - uniforms.texelSize * offset;
  output.vRightBlur = v_uv + uniforms.texelSize * offset;
  //Position
  output.Position = vec4f(pos[input.VertexIndex], 0.0, 1.0);
  return output;
}