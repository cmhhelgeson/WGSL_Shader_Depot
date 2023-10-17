export const FluidComputeShader = (maxWorkgroupsSizeX: number) => {
  return `
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

// Storage Buffers
@group(0) @binding(0) var<storage, read> input_particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> output_particles: array<Particle>;

// Uniform Buffers
@group(1) @binding(0) var<uniform> particle_uniforms: ParticleUniforms;
@group(1) @binding(1) var<uniform> general_uniforms: GeneralUniforms;

@compute @workgroup_size(${maxWorkgroupsSizeX}, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let num_particles = arrayLength(&input_particles);
  let src_particle = input_particles[global_id.x];
  let dst_particle = &output_particles[global_id.x];
  (*dst_particle) = src_particle;
  (*dst_particle).velocity += vec2<f32>(0.0, 1.0) * particle_uniforms.gravity * general_uniforms.time;
  (*dst_particle).position += (*dst_particle).velocity * general_uniforms.time;
  if (
    abs((*dst_particle).position.x) > general_uniforms.halfBoundsX
  ) {
    (*dst_particle).velocity.x *= -1 * particle_uniforms.damping;
    (*dst_particle).position.x = general_uniforms.halfBoundsX * sign((*dst_particle).position.x);
    (*dst_particle).velocity.x *= -1 * particle_uniforms.damping;
  }
  if (
    abs( (*dst_particle).position.y ) > general_uniforms.halfBoundsY
  ) {
    (*dst_particle).velocity.y *= -1 * particle_uniforms.damping;
    (*dst_particle).position.y = general_uniforms.halfBoundsY * sign((*dst_particle).position.y);
    (*dst_particle).velocity.y *= -1 * particle_uniforms.damping;
  }
}`;
};
