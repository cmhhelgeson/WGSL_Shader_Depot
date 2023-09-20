struct Uniforms {
  rowLength: i32,
}

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;
@group(0) @binding(1)
var<storage, read> char_array: array<i32>
@group(0) @binding(2)
var<storage, read_write> output: array<i32>;
//global_invocation_id is the unique id of a unit of work within an entire grid
//local_invocation_id is the unique id of a unit of work within a workgroup
@compute @workgroup_size(64)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let ch1 = char_array[global_invocation_id.x];
  let ch2 = char_array[global_invocation_id.x];

  let y = ch1 - 97;
  let x = ch2 - 97;

  let dst = &output[y * uniforms.rowLength + x];
  (*dst) += 1;
}