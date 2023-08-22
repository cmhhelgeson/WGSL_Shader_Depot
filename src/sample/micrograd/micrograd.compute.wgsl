

struct MicroGradValue {
  data: f32,
  grad: f32,
}

struct Uniforms {
  stepSize: f32,
}

@group(0) @binding(0)
var<storage, read_write> data: array<MicroGradValue>

@group(0) @binding(1)
var<uniform> uniforms: Uniforms;

fn computeMain() {

  let dst_micrograd = &data[global_id.x];
  (*dst_micrograd).data += uniforms.stepSize * (*dst_micrograd).grad;

  

}