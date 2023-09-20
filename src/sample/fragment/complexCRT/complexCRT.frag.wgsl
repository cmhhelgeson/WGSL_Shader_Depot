struct Uniforms {
  debugStep: i32,
  canvasWidth: i32,
  canvasHeight: i32,
  time: f32,
  cellOffset: f32,
  cellSize: f32,
  borderMask: f32
}

@group(0) @binding(0) uniforms: Uniforms;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var pixel = input.uv * vec2<i32>(
    uniforms.canvasWidth, 
    uniforms.canvasHeight
  );

  var coord = pixel / uniforms.cellSize;

  var subcoord = coord * vec2<i32>(3, 1);

  var cell_offset = vec2<i32>(0, fract(floor(coord.x) * 0.5));

  var ind = floor(subcoord.x) % 3;

  var mask_color = vec3<f32>(
    f32(ind == 0.0), 
    f32(ind == 1.0), 
    f32(ind == 2.0)
  ) * 3.0;

  var cell_uv = fract(subcoord + cell_offset) * 2.0 - 1.0;
  var border: vec2<f32> = 1.0 - cell_uv * cell_uv * uniforms.borderMask;

  mask_color.rgb *= border.x * border.y;

  return vec4<f32>(mask_color, 1.0);
}