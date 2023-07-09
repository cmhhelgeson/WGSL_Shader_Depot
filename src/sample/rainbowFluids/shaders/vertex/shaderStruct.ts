/* eslint-disable prettier/prettier */

// COMMON STRUCTS
export const STRUCT_VERTEX_OUTPUT = `
struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) uv : vec2<f32>,
}`;

export const STRUCT_GRID_INFO = `
struct GridInfo {
  simWidth: f32,
  simHeight: f32,
  dyeWidth: f32,
  dyeHeight: f32,
  canvasWidth: f32,
  canvasHeight: f32,
  simReciprocal: f32,
  simSpatialStep: f32,
  dyeSpacialStep: f32
}`;

export const STRUCT_MOUSE = `
struct Mouse {
  pos: vec2<f32>,
  vel: vec2<f32>,
}`;

export const STRUCT_SPLAT_UNIFORMS = `
struct SplatUniforms {
  vel_force: f32,
  vel_radius: f32,
  vel_diff: f32,
  dye_force: f32,
  dye_radius: f32,
  dye_diff: f32,
  time: f32,
  dt: f32,
  symmetry: f32,
  vorticity: f32,
  viscosity: f32,
  containFluid: f32,
}`;

