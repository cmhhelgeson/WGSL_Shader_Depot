/* eslint-disable prettier/prettier */
const VERTEX_BASE_OUTPUT_STRUCT = `
struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) v_uv : vec2<f32>,
  @location(1) vL: vec2<f32>,
  @location(2) vR: vec2<f32>,
  @location(3) vT: vec2<f32>,
  @location(4) vB: vec2<f32>,
}
`;

export const VertexBaseWGSL = `
${VERTEX_BASE_OUTPUT_STRUCT}

struct VertexUniforms {
  texelSize: vec2<f32>;
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
`;

const STRUCT_GRID_SIZE = `
struct TextureDimensions {
  simWidth : f32,
  simHeight : f32,
  dyeWidth: f32,
  dyeHeight: f32,
  dx : f32,
  rdx : f32,
  dyeRdx : f32
}`;

const STRUCT_MOUSE = `
struct Mouse {
  pos: vec2<f32>,
  vel: vec2<f32>,
}`;

// This code initialize the pos and index variables and target only interior cells
const COMPUTE_VELOCITY_START = `
var velocityGridPos = vec2<f32>(
  floor(input.uv.x * canvasSize.x), floor(input.uv.y * canvasSize.y)
);

if (
  velocityGridPos.x == 0 || 
  velocityGridPos.y == 0 || 
  velocityGridPos.x >= uGrid.simWidth - 1 || 
  velocityGridPos.y >= uGrid.simHeight - 1) {
    return;
}      

let index = ID(pos.x, pos.y);`

const COMPUTE_START_DYE = `
var dyeGridPos = vec2<f32>(
  floor(input.uv.x * canvasSize.x), floor(input.uv.y * canvasSize.y)
);

if (
  dyeGridPos.x == 0 || 
  dyeGridPos.y == 0 || 
  dyeGridPos.x >= uGrid.dyeWidthidth - 1 || 
  dyeGridPos.y >= uGrid.dyeHeighteight - 1) {
    return;
}      

let index = ID(pos.x, pos.y);`

// This code initialize the pos and index variables and target all cells
const COMPUTE_START_ALL = `    
var pos = vec2<f32>(
  floor(input.uv.x * canvasSize.x), floor(input.uv.y * canvasSize.y)
);

if (pos.x >= uGrid.simWidth || pos.y >= uGrid.simHeight) {
    return;
}      

let index = ID(pos.x, pos.y);`

const SPLAT_CODE = `
var m = uMouse.pos;
var v = uMouse.vel*2.;

var splat = createSplat(p, m, v, uRadius);
if (uSymmetry == 1. || uSymmetry == 3.) {splat += createSplat(p, vec2(1. - m.x, m.y), v * vec2(-1., 1.), uRadius);}
if (uSymmetry == 2. || uSymmetry == 3.) {splat += createSplat(p, vec2(m.x, 1. - m.y), v * vec2(1., -1.), uRadius);}
if (uSymmetry == 3. || uSymmetry == 4.) {splat += createSplat(p, vec2(1. - m.x, 1. - m.y), v * vec2(-1., -1.), uRadius);}
`

/// APPLY FORCE SHADER ///

const updateVelocityShader = /* wgsl */`

${ STRUCT_GRID_SIZE }

struct Mouse {
  pos: vec2<f32>,
  vel: vec2<f32>,
}
@group(0) @binding(0) var velocity_input_texture_xy: texture_2d<f32>;
@group(0) @binding(4) var<uniform> uGrid: GridSize;
@group(0) @binding(5) var<uniform> uMouse: Mouse;
@group(0) @binding(6) var<uniform> uForce : f32;
@group(0) @binding(7) var<uniform> uRadius : f32;
@group(0) @binding(8) var<uniform> uDiffusion : f32;
@group(0) @binding(9) var<uniform> uDt : f32;
@group(0) @binding(10) var<uniform> uTime : f32;
@group(0) @binding(11) var<uniform> uSymmetry : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }
fn inBetween(x : f32, lower : f32, upper : f32) -> bool {
  return x > lower && x < upper;
}
fn inBounds(pos : vec2<f32>, xMin : f32, xMax : f32, yMin: f32, yMax : f32) -> bool {
  return inBetween(pos.x, xMin * uGrid.simWidth, xMax * uGrid.simWidth) && inBetween(pos.y, yMin * uGrid.simHeight, yMax * uGrid.simHeight);
}

fn createSplat(pos : vec2<f32>, splatPos : vec2<f32>, vel : vec2<f32>, radius : f32) -> vec2<f32> {
  var p = pos - splatPos;
  p.x *= uGrid.simWidth / uGrid.simHeight;
  var v = vel;
  v.x *= uGrid.simWidth / uGrid.simHeight;
  var splat = exp(-dot(p, p) / radius) * v;
  return splat;
}

@fragment
fn main(
  @builtin(global_invocation_id) global_id : vec3<u32>
) {
    
    ${ COMPUTE_VELOCITY_START }

    let tmpT = uTime;
    var p = pos/vec2(uGrid.simWidth, uGrid.simHeight);

    ${ SPLAT_CODE }
    
    splat *= uForce * uDt * 200.;

    x_out[index] = x_in[index]*uDiffusion + splat.x;
    y_out[index] = y_in[index]*uDiffusion + splat.y;
    
    // var distt = distance(pos/vec2(uGrid.simWidth, uGrid.simHeight), vec2(m.x, m.y));
    // var influenceRadius = 0.06;
    // if(distt < influenceRadius) {
    //   var v = uMouse.vel * .25;
    //   x_out[index] += v.x;
    //   y_out[index] += v.y;
    // }
}`

const updateDyeShader = /* wgsl */`

${ STRUCT_GRID_SIZE }

struct Mouse {
  pos: vec2<f32>,
  vel: vec2<f32>,
}
@group(0) @binding(0) var dye_inpute_texture_xyz: texture_2d<f32>;
@group(0) @binding(6) var<uniform> uGrid: GridSize;
@group(0) @binding(7) var<uniform> uMouse: Mouse;
@group(0) @binding(8) var<uniform> uForce : f32;
@group(0) @binding(9) var<uniform> uRadius : f32;
@group(0) @binding(10) var<uniform> uDiffusion : f32;
@group(0) @binding(11) var<uniform> uTime : f32;
@group(0) @binding(12) var<uniform> uDt : f32;
@group(0) @binding(13) var<uniform> uSymmetry : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.dyeWidth); }
fn inBetween(x : f32, lower : f32, upper : f32) -> bool {
  return x > lower && x < upper;
}
fn inBounds(pos : vec2<f32>, xMin : f32, xMax : f32, yMin: f32, yMax : f32) -> bool {
  return inBetween(pos.x, xMin * uGrid.dyeWidth, xMax * uGrid.dyeWidth) && inBetween(pos.y, yMin * uGrid.dyeHeight, yMax * uGrid.dyeHeight);
}
// cosine based palette, 4 vec3 params
fn palette(t : f32, a : vec3<f32>, b : vec3<f32>, c : vec3<f32>, d : vec3<f32> ) -> vec3<f32> {
    return a + b*cos( 6.28318*(c*t+d) );
}

fn createSplat(pos : vec2<f32>, splatPos : vec2<f32>, vel : vec2<f32>, radius : f32) -> vec3<f32> {
  var p = pos - splatPos;
  p.x *= uGrid.simWidth / uGrid.simHeight;
  var v = vel;
  v.x *= uGrid.simWidth / uGrid.simHeight;
  var splat = exp(-dot(p, p) / radius) * length(v);
  return vec3(splat);
}

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

    ${ COMPUTE_START_DYE }

    // var col_start = palette(uTime/8., vec3(0.875, 0.516, 0.909), vec3(0.731, 0.232, 0.309), vec3(1.566, 0.088, 1.466), vec3(0.825, 5.786, 3.131));
    // var col_start = palette(uTime/8., vec3(0.383, 0.659, 0.770), vec3(0.322, 0.366, 0.089), vec3(1.132, 1.321, 0.726), vec3(6.241, 4.902, 1.295));
    // let col_start = palette(uTime/8., vec3(0.5), vec3(0.5), vec3(1), vec3(0.333, 0.667, 0.999));
    let col_incr = 0.15;
    let col_start = palette(uTime/8., vec3(1), vec3(0.5), vec3(1), vec3(0, col_incr, col_incr*2.));
    // let col_start = vec3(1.+uTime*0.);
    // let col_start = palette(uTime/8., vec3(${Math.random()}, ${Math.random()}, ${Math.random()}), vec3(${Math.random()}, ${Math.random()}, ${Math.random()}), vec3(${Math.random()}, ${Math.random()}, ${Math.random()}), vec3(${Math.random()}, ${Math.random()}, ${Math.random()}));

    var p = pos/vec2(uGrid.dyeWidth, uGrid.dyeHeight);

    ${ SPLAT_CODE }

    splat *= col_start * uForce * uDt * 100.;

    x_out[index] = max(0., x_in[index]*uDiffusion + splat.x);
    y_out[index] = max(0., y_in[index]*uDiffusion + splat.y);
    z_out[index] = max(0., z_in[index]*uDiffusion + splat.z);

    // x_out[index]  = x_in[index]*uDiffusion;
    // y_out[index]  = y_in[index]*uDiffusion;
    // z_out[index]  = z_in[index]*uDiffusion;

    // var distt = distance(pos/vec2(uGrid.dyeWidth, uGrid.dyeHeight), m);
    // var influenceRadius = 0.06;
    // if(distt < influenceRadius) {
    //   var density = ((influenceRadius - distt) / influenceRadius) * 0.004 * length(uMouse.vel)*5000.;
    //   x_out[index] -= density;
    //   y_out[index] -= density;
    //   z_out[index] -= density;
    // }

    // x_out[index] = max(0., x_out[index]);
    // y_out[index] = max(0., y_out[index]);
    // z_out[index] = max(0., z_out[index]);
}`


/// ADVECT SHADER ///

const advectShader = /* wgsl */`

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var input_texture_xy: texture_2d<f32>;
@group(0) @binding(2) var velocity_input_texture_xy: texture_2d<f32>;
@group(0) @binding(4) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(5) var<storage, read_write> y_out : array<f32>;
@group(0) @binding(6) var<uniform> uGrid: GridSize;
@group(0) @binding(7) var<uniform> uDt: f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }
fn in(x : f32, y : f32) -> vec2<f32> { let id = ID(x, y); return vec2(x_in[id], y_in[id]); }

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  
    ${ COMPUTE_VELOCITY_START }
    
    var x = pos.x - uDt * uGrid.rdx * x_vel[index];
    var y = pos.y - uDt * uGrid.rdx * y_vel[index];

    if (x < 0) { x = 0; }
    else if (x >= uGrid.simWidth - 1) { x = uGrid.simWidth - 1; }
    if (y < 0) { y = 0; }
    else if (y >= uGrid.simHeight - 1) { y = uGrid.simHeight - 1; }

    let x1 = floor(x);
    let y1 = floor(y);
    let x2 = x1 + 1;
    let y2 = y1 + 1;

    let TL = in(x1, y2);
    let TR = in(x2, y2);
    let BL = in(x1, y1);
    let BR = in(x2, y1);

    let xMod = fract(x);
    let yMod = fract(y);
    
    let bilerp = mix( mix(BL, BR, xMod), mix(TL, TR, xMod), yMod );

    x_out[index] = bilerp.x;
    y_out[index] = bilerp.y;
}`

const advectDyeShader = /* wgsl */`

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var dye_input_texture_xyz: texture_2d<f32>;
@group(0) @binding(3) var velocity_input_texture_xy: texture_2d<f32>;
@group(0) @binding(8) var<uniform> uGrid : GridSize;
@group(0) @binding(9) var<uniform> uDt : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.dyeWidth); }
fn in(x : f32, y : f32) -> vec3<f32> { let id = ID(x, y); return vec3(x_in[id], y_in[id], z_in[id]); }
fn vel(x : f32, y : f32) -> vec2<f32> { 
  let id = u32(i32(x) + i32(y) * i32(uGrid.simWidth));
  return vec2(x_vel[id], y_vel[id]);
}

fn vel_bilerp(x0 : f32, y0 : f32) -> vec2<f32> {
    var x = x0 * uGrid.simWidth / uGrid.dyeWidth;
    var y = y0 * uGrid.simHeight / uGrid.dyeHeight;

    if (x < 0) { x = 0; }
    else if (x >= uGrid.simWidth - 1) { x = uGrid.simWidth - 1; }
    if (y < 0) { y = 0; }
    else if (y >= uGrid.simHeight - 1) { y = uGrid.simHeight - 1; }

    let x1 = floor(x);
    let y1 = floor(y);
    let x2 = x1 + 1;
    let y2 = y1 + 1;

    let TL = vel(x1, y2);
    let TR = vel(x2, y2);
    let BL = vel(x1, y1);
    let BR = vel(x2, y1);

    let xMod = fract(x);
    let yMod = fract(y);

    return mix( mix(BL, BR, xMod), mix(TL, TR, xMod), yMod );
}

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

    ${ COMPUTE_START_DYE }

    let V = vel_bilerp(pos.x, pos.y);

    var x = pos.x - uDt * uGrid.dyeRdx * V.x;
    var y = pos.y - uDt * uGrid.dyeRdx * V.y;

    if (x < 0) { x = 0; }
    else if (x >= uGrid.dyeWidth - 1) { x = uGrid.dyeWidth - 1; }
    if (y < 0) { y = 0; }
    else if (y >= uGrid.dyeHeight - 1) { y = uGrid.dyeHeight - 1; }

    let x1 = floor(x);
    let y1 = floor(y);
    let x2 = x1 + 1;
    let y2 = y1 + 1;

    let TL = in(x1, y2);
    let TR = in(x2, y2);
    let BL = in(x1, y1);
    let BR = in(x2, y1);

    let xMod = fract(x);
    let yMod = fract(y);

    let bilerp = mix( mix(BL, BR, xMod), mix(TL, TR, xMod), yMod );

    x_out[index] = bilerp.x;
    y_out[index] = bilerp.y;
    z_out[index] = bilerp.z;
}`

/// DIVERGENCE SHADER ///

const divergenceShader = /* wgsl */`   

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var velocity_input_texture_xy: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }
fn vel(x : f32, y : f32) -> vec2<f32> { let id = ID(x, y); return vec2(x_vel[id], y_vel[id]); }

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${ COMPUTE_VELOCITY_START }

  let L = vel(pos.x - 1, pos.y).x;
  let R = vel(pos.x + 1, pos.y).x;
  let B = vel(pos.x, pos.y - 1).y;
  let T = vel(pos.x, pos.y + 1).y;

  div[index] = 0.5 * uGrid.rdx * ((R - L) + (T - B));
}`

/// PRESSURE SHADER ///

const pressureShader = /* wgsl */`      

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var pressure_texture_x: texture_2d<f32>;
@group(0) @binding(1) var divergence_texture_x: texture_2d<f32>; 
@group(0) @binding(3) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }
fn in(x : f32, y : f32) -> f32 { let id = ID(x, y); return pres_in[id]; }

@fragment
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${ COMPUTE_VELOCITY_START }
        
  let L = pos - vec2(1, 0);
  let R = pos + vec2(1, 0);
  let B = pos - vec2(0, 1);
  let T = pos + vec2(0, 1);

  let Lx = in(L.x, L.y);
  let Rx = in(R.x, R.y);
  let Bx = in(B.x, B.y);
  let Tx = in(T.x, T.y);

  let bC = div[index];

  let alpha = -(uGrid.dx * uGrid.dx);
  let rBeta = .25;

  pres_out[index] = (Lx + Rx + Bx + Tx + alpha * bC) * rBeta;
}`

/// GRADIENT SUBTRACT SHADER ///

const gradientSubtractShader = /* wgsl */`      

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var<storage, read> pressure : array<f32>;
@group(0) @binding(1) var velocity_input_texture_xy: texture_2d<f32>;
@group(0) @binding(5) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }
fn pres(x : f32, y : f32) -> f32 { let id = ID(x, y); return pressure[id]; }

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${ COMPUTE_VELOCITY_START }

  let L = pos - vec2(1, 0);
  let R = pos + vec2(1, 0);
  let B = pos - vec2(0, 1);
  let T = pos + vec2(0, 1);

  let xL = pres(L.x, L.y);
  let xR = pres(R.x, R.y);
  let yB = pres(B.x, B.y);
  let yT = pres(T.x, T.y);
  
  let finalX = x_vel[index] - .5 * uGrid.rdx * (xR - xL);
  let finalY = y_vel[index] - .5 * uGrid.rdx * (yT - yB);

  x_out[index] = finalX;
  y_out[index] = finalY;
}`

/// VORTICITY SHADER ///

const vorticityShader = /* wgsl */`      

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var velocity_input_texture_xy: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> vorticity : array<f32>;
@group(0) @binding(3) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }
fn vel(x : f32, y : f32) -> vec2<f32> { let id = ID(x, y); return vec2(x_vel[id], y_vel[id]); }

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${ COMPUTE_VELOCITY_START }

  let Ly = vel(pos.x - 1, pos.y).y;
  let Ry = vel(pos.x + 1, pos.y).y;
  let Bx = vel(pos.x, pos.y - 1).x;
  let Tx = vel(pos.x, pos.y + 1).x;

  vorticity[index] = 0.5 * uGrid.rdx * ((Ry - Ly) - (Tx - Bx));
}`

/// VORTICITY CONFINMENT SHADER ///

const vorticityConfinmentShader = /* wgsl */`      

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var velocity_input_texture_xy: texture_2d<f32>;
@group(0) @binding(2) var<storage, read> vorticity : array<f32>;
@group(0) @binding(5) var<uniform> uGrid : GridSize;
@group(0) @binding(6) var<uniform> uDt : f32;
@group(0) @binding(7) var<uniform> uVorticity : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }
fn vort(x : f32, y : f32) -> f32 { let id = ID(x, y); return vorticity[id]; }

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${ COMPUTE_VELOCITY_START }

  let L = vort(pos.x - 1, pos.y);
  let R = vort(pos.x + 1, pos.y);
  let B = vort(pos.x, pos.y - 1);
  let T = vort(pos.x, pos.y + 1);
  let C = vorticity[index];

  var force = 0.5 * uGrid.rdx * vec2(abs(T) - abs(B), abs(R) - abs(L));

  let epsilon = 2.4414e-4;
  let magSqr = max(epsilon, dot(force, force));

  force = force / sqrt(magSqr);
  force *= uGrid.dx * uVorticity * uDt * C * vec2(1, -1);

  x_vel_out[index] = x_vel_in[index] + force.x;
  y_vel_out[index] = y_vel_in[index] + force.y;
}`

/// CLEAR PRESSURE SHADER ///

const clearPressureShader = /* wgsl */`  

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var input_texture_x: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uGrid : GridSize;
@group(0) @binding(3) var<uniform> uVisc : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${ COMPUTE_START_ALL }

  x_out[index] = x_in[index]*uVisc;
}`

/// BOUNDARY SHADER ///

const boundaryShader = /* wgsl */`

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var input_texture_xy: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(3) var<storage, read_write> y_out : array<f32>;
@group(0) @binding(4) var<uniform> uGrid : GridSize;
@group(0) @binding(5) var<uniform> containFluid : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${ COMPUTE_START_ALL }

  // disable scale to disable contained bounds
  var scaleX = 1.;
  var scaleY = 1.;

  if (pos.x == 0) { pos.x += 1; scaleX = -1.; }
  else if (pos.x == uGrid.simWidth - 1) { pos.x -= 1; scaleX = -1.; }
  if (pos.y == 0) { pos.y += 1; scaleY = -1.; }
  else if (pos.y == uGrid.simHeight - 1) { pos.y -= 1; scaleY = -1.; }

  if (containFluid == 0.) {
    scaleX = 1.;
    scaleY = 1.;
  }

  x_out[index] = x_in[ID(pos.x, pos.y)] * scaleX;
  y_out[index] = y_in[ID(pos.x, pos.y)] * scaleY;
}`

/// BOUNDARY PRESSURE SHADER ///

const boundaryPressureShader = /* wgsl */`    

${ STRUCT_GRID_SIZE }

@group(0) @binding(0) var input_texture_x: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.simWidth); }

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${ COMPUTE_START_ALL }

  if (pos.x == 0) { pos.x += 1; }
  else if (pos.x == uGrid.simWidth - 1) { pos.x -= 1; }
  if (pos.y == 0) { pos.y += 1; }
  else if (pos.y == uGrid.simHeight - 1) { pos.y -= 1; }

  x_out[index] = x_in[ID(pos.x, pos.y)];
}`

const checkerboardShader = /* wgsl */`    

${ STRUCT_GRID_SIZE }


@group(0) @binding(3) var<uniform> uGrid : GridSize;
@group(0) @binding(4) var<uniform> uTime : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.dyeWidth); }

fn noise(p_ : vec3<f32>) -> f32 {
  var p = p_;
	var ip=floor(p);
  p-=ip; 
  var s=vec3(7.,157.,113.);
  var h=vec4(0.,s.y, s.z,s.y+s.z)+dot(ip,s);
  p=p*p*(3. - 2.*p); 
  h=mix(fract(sin(h)*43758.5),fract(sin(h+s.x)*43758.5),p.x);
  var r=mix(h.xz,h.yw,p.y);
  h.x = r.x;
  h.y = r.y;
  return mix(h.x,h.y,p.z); 
}

fn fbm(p_ : vec3<f32>, octaveNum : i32) -> vec2<f32> {
  var p=p_;
	var acc = vec2(0.);	
	var freq = 1.0;
	var amp = 0.5;
  var shift = vec3(100.);
	for (var i = 0; i < octaveNum; i++) {
		acc += vec2(noise(p), noise(p + vec3(0.,0.,10.))) * amp;
    p = p * 2.0 + shift;
    amp *= 0.5;
	}
	return acc;
}

fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${ COMPUTE_START_DYE }

  var uv = pos/vec2(uGrid.dyeWidth, uGrid.dyeHeight);
  var zoom = 4.;

  var smallNoise = fbm(vec3(uv.x*zoom*2., uv.y*zoom*2., uTime+2.145), 7) - .5;
  var bigNoise = fbm(vec3(uv.x*zoom, uv.y*zoom, uTime*.1+30.), 7) - .5;

  var noise = max(length(bigNoise) * 0.035, 0.);
  var noise2 = max(length(smallNoise) * 0.035, 0.);

  noise = noise + noise2 * .05;

  var czoom = 4.;
  var n = fbm(vec3(uv.x*czoom, uv.y*czoom, uTime*.1+63.1), 7)*.75+.25;
  var n2 = fbm(vec3(uv.x*czoom, uv.y*czoom, uTime*.1+23.4), 7)*.75+.25;
  // var col = 6.*vec3(n.x, n.y, n2.x);
  
  var col = vec3(1.);

  x_out[index] += noise * col.x;
  y_out[index] += noise * col.y;
  z_out[index] += noise * col.z;
}`
