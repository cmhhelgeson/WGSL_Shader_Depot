struct Ball {
  radius: f32,
  position: vec2<f32>,
  velocity: vec2<f32>,
}
struct UniformData {
  canvasWidth: i32,
  canvasHeight: i32
}
@group(0) @binding(0)
var<storage, > input: array<Ball>;
@group(0) @binding(1)
var<storage, read_write> output: array<Ball>;
@group(0) @binding(2)
var<uniform> uniforms: UniformData;
const TIME_STEP: f32 = 0.016;
//global_invocation_id is the unique id of a unit of work within an entire grid
//local_invocation_id is the unique id of a unit of work within a workgroup
@compute @workgroup_size(64)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let num_balls = arrayLength(&output);
  if (global_id.x >= arrayLength(&output)) {
    return;
  }
  let src_ball = input[global_id.x];
  let dst_ball = &output[global_id.x];
  (*dst_ball) = src_ball;
  (*dst_ball).position = (*dst_ball).position + (*dst_ball).velocity * TIME_STEP;
  if ( 
    (*dst_ball).position[0] >= f32(uniforms.canvasWidth) ||
    (*dst_ball).position[0] <= 0.0
  ) {
    (*dst_ball).velocity[0] = src_ball.velocity[0] * -1;
  }
  if ( 
    (*dst_ball).position[1] >= f32(uniforms.canvasHeight) ||
    (*dst_ball).position[1] <= 0.0
  ) {
    (*dst_ball).velocity[1] = src_ball.velocity[1] * -1;
  }
}