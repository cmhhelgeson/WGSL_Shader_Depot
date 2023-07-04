struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

@group(0) @binding(0) var<uniform> lerpController: f32;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {

  //Smooth out smooth in progression of uvx
  var smoothedUVX = smoothstep(0.0, 1.0, input.v_uv.x);
  var clampedUVX = min(max(input.v_uv.x, 0.25), 0.75);
  //Vertical line
  var color: vec3f = vec3f(
    smoothstep(0.0, lerpController, abs(input.v_uv.y - 0.5))
  );
  //Linear line (If uvs go up, then it should start in the middle and go down)
  var linearLine: vec3f = vec3f(
    smoothstep(0.0, 0.0075, abs(input.v_uv.y - mix(0.5, 1, input.v_uv.x)))
  );
  //SmoothStep line rperesentation
  var smoothLine: vec3f = vec3f(
    smoothstep(0.0, 0.0075, abs(input.v_uv.y - mix(0.0, 0.5, clampedUVX)))
  );

  var red = vec3f(1.0, 0.0, 0.0);
  var blue = vec3f(0.0, 0.0, 1.0);
  var white = vec3f(1.0, 1.0, 1.0);

  if (input.v_uv.y < 0.5) {
    //Linear mix
    color = mix(red, blue, input.v_uv.x);
  } else {
    //smoothstep mix
    color = mix(red, blue, smoothstep(0.0, 1.0, input.v_uv.x));
  }

  //Add two white lines
  color = mix(white, color, linearLine); 
  color = mix(white, color, smoothLine);
  
  return vec4f(color, 1.0);

}