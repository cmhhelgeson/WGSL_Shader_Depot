struct Particle {
  color: vec3<f32>,
  position: vec2<f32>,
  velocity: vec2<f32>,
}

struct GeneralUniforms {
  time: f32,
  halfBoundsX: f32,
  halfBoundsY: f32,
}

struct ParticleUniforms {
  damping: f32,
  gravity: f32,
  radius: f32,
}


@group(0) @binding(0) var<storage, read> input_particles: array<Particle>
@group(0) @binding(1) var<storage, read_write> output_particles: array<Particle>

@group(1) @binding(0) var<uniform> particle_uniforms: ParticleUniforms;
@group(1) @binding(1) var<uniform> general_uniforms: GeneralUniforms;

var<workgroup> halfBoundsSize: f32;

@compute @workgroup_size(64)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let num_particles = arrayLength(&input_particles);
  let src_particle = input[global_id.x];
  let dst_ball = &output[global_id.x];
  (*dst_ball) = src_ball;
  (*dst_ball).velocity += vec2<f32>(0.0, 1.0) * particle_uniforms.gravity * general_uniforms.time;
  (*dst_ball).position += (*dst_ball).velocity * general_uniforms.time;
  if abs((*dst_ball).position.x > general_uniforms.halfBoundsX) {
    (*dst_ball).position.x = general_uniforms.halfBoundsX * sign((*dst_ball).position.x)
    (*dst_ball).velocity.x *= -1 * particle_uniforms.damping;
  }
  if abs((*dst_ball).position.y > general_uniforms.halfBoundsY) {
    (*dst_ball).position.y = general_uniforms.halfBoundsY * sign((*dst_ball).position.y)
    (*dst_ball).velocity.y *= -1 * particle_uniforms.damping;
  }

}