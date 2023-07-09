/* eslint-disable prettier/prettier */

// COMMON STRUCTS
const STRUCT_VERTEX_OUTPUT = `
struct VertexBaseOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) uv : vec2<f32>,
}`;

const STRUCT_GRID_INFO = `
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

const STRUCT_MOUSE = `
struct Mouse {
  pos: vec2<f32>,
  vel: vec2<f32>,
}`;

const STRUCT_SPLAT_UNIFORMS = `
struct SplatUniforms {
  force: f32,
  radius: f32;
  diffusion: f32;
  time: f32;
  dt; f32;
  symmetry: f32
  vorticity: f32,
  viscosity: f32,
  containFluid: f32,
}`;

export const VertexBaseShader = `
${STRUCT_VERTEX_OUTPUT}

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

  const uv = array(
    pos[0] * 0.5 + 0.5,
    pos[1] * 0.5 + 0.5,
    pos[2] * 0.5 + 0.5,
    pos[3] * 0.5 + 0.5,
    pos[4] * 0.5 + 0.5,
    pos[5] * 0.5 + 0.5,
  );

  var output: VertexBaseOutput;
  output.uv = uv[input.VertexIndex];
  output.Position = vec4f(pos[VertexIndex], 0.0, 1.0);
  return output;
}
`;


const FRAGMENT_START = (
  width: string,
  height: string,
  canvasWidth: string,
  canvasHeight: string
) => {return `
var pos = vec2<f32>(
  floor(input.uv.x * ${canvasWidth}), floor(input.uv.y * ${canvasHeight})
);

if (
  pos.x == 0 || 
  pos.y == 0 || 
  pos.x >= ${width} - 1 || 
  pos.y >= ${height} - 1) {
    return;
}      

let index = ID(pos.x, pos.y);
`;}

const FRAGMENT_VELOCITY_START = FRAGMENT_START(
  'gridInfo.simWidth',
  'gridInfo.simHeight',
  'gridInfo.canvasWidth',
  'gridInfo.canvasHeight'
);

const FRAGMENT_DYE_START = FRAGMENT_START(
  'gridInfo.dyeWidth',
  'gridInfo.dyeHeight',
  'gridInfo.canvas',
  'gridInfo.canvasHeight'
);

// This code initialize the pos and index variables and target all cells
const FRAGMENT_START_ALL = `    
var pos = vec2<f32>(
  floor(input.uv.x * gridInfo.canvasWidth), floor(input.uv.y * gridInfo.canvasHeight)
);

if (pos.x >= gridInfo.simWidth || pos.y >= gridInfo.simHeight) {
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
// COMMON FUNCTIONS

const IDFunc = (widthStringParameter: string) => { return `
fn ID(x : f32, y : f32) -> u32 { return u32(x + y * ${widthStringParameter}); }
`};

const InBoundsFunc = (
  width: string,
  height: string
) => {return`
fn inBetween(x : f32, lower : f32, upper : f32) -> bool {
  return x > lower && x < upper;
}
fn inBounds(pos : vec2<f32>, xMin : f32, xMax : f32, yMin: f32, yMax : f32) -> bool {
  return inBetween(pos.x, xMin * ${width}, xMax * ${width}) && inBetween(pos.y, yMin * ${height}, yMax * ${height});
}
`}

// @arg pos = grid pixel normalized coordinates
const CreateSplatFunc = (
  type: 'scalar' | 'directional'
) =>  {return`
fn createSplat(pos : vec2<f32>, splatPos : vec2<f32>, vel : vec2<f32>, radius : f32) -> vec3<f32> {
  //Distance of pixel from splatCenter
  var p = pos - splatPos;
  p.x *= grid_info.simWidth / grid_info.simHeight;
  var v = vel;
  v.x *= grid_info.simWidth / grid_info.simHeight;
  // 1. Get the magnitude of the distance from the splat center
  // 2. Make the magnitude negative so the velocity peters out farther away from the splat
  // 3. Scale the magnitude by the splat's radius. Larger splats will make the splat dissipate
  //    at a slower rate.
  // 4. Make the dissipation occur at a natural rate bound by e.
  // 5. Choose whether dissipation is affected by direction
  var splat = exp(-dot(p, p) / radius) * ${type === 'scalar' ? 'length(v)' : 'v'};
  return vec3(splat);
}`};

/// APPLY FORCE SHADER ///

export const updateVelocityShader = /* wgsl */`

${STRUCT_VERTEX_OUTPUT}
${ STRUCT_GRID_INFO }
${STRUCT_MOUSE}
${STRUCT_SPLAT_UNIFORMS}

//First are general uniforms
@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(1) var<uniform> mouse: Mouse;
//Then fragment specific uniforms
@group(2) @binding(0) var<uniform> uniforms: SplatUniforms
//Then the input, which changes every pass (rg16f)
@group(3) @binding(0) var output_xy: texture_2d<f32>;

${IDFunc('gridInfo.simWidth')}

${InBoundsFunc('gridInfo.simWidth', 'gridInfo.simHeight')}

${CreateSplatFunc('directional')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec2<f32> {
    
    //Check whether the position of the fragment is withint the bounds of our texture
    ${ FRAGMENT_VELOCITY_START }

    //let tmpT = uTime;
    //Get normalized coordinates of the pixel (could just take v_uv)
    var p = pos/vec2(grid_info.simWidth, grid_info.simHeight);

    ${ SPLAT_CODE }
    
    var output: vec2<f32> = textureLoad(
      velocity_input_texture_xy,
      vec3<f>(velocityGridPos, 0.0),
    ).xy + splat;
    
    return vec2<f32>(output);
}`

export const updateDyeShader = /* wgsl */`
${STRUCT_VERTEX_OUTPUT}
${ STRUCT_GRID_INFO }
${ STRUCT_MOUSE }
${STRUCT_SPLAT_UNIFORMS}

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(1) var<uniform> mouse: Mouse;
@group(2) @binding(0) var<uniform> uniforms: SplatUniforms
@group(3) @binding(0) var dye_input_texture_xyz: texture_2d<f32>;

${IDFunc('grid_info.dyeWidth')}

${InBoundsFunc('grid_info.dyeWidth', 'grid_info.dyeHeight')}

// cosine based palette, 4 vec3 params
fn palette(t : f32, a : vec3<f32>, b : vec3<f32>, c : vec3<f32>, d : vec3<f32> ) -> vec3<f32> {
    return a + b*cos( 6.28318*(c*t+d) );
}

${CreateSplatFunc('scalar')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {

    ${ FRAGMENT_DYE_START }

    let col_incr = 0.15;
    let col_start = palette(uTime/8., vec3(1), vec3(0.5), vec3(1), vec3(0, col_incr, col_incr*2.));

    var p = pos/vec2(grid_info.dyeWidth, grid_info.dyeHeight);

    ${ SPLAT_CODE }

    splat *= col_start * uForce * uDt * 100.;

    var color: vec4<f32> = textureLoad(dye_input_texture_xyz, pos);
    color.x = max(0.0, color.x * uniforms.diffusion + splat.x);
    color.y = max(0.0, color.y * uniforms.diffusion + splat.y)
    color.z = max(0.0, color.z * uniforms.diffusion + splat.z)

    return vec4<f32>(color, 1.0);
}`;


/// ADVECT SHADER ///

export const advectShader = /* wgsl */`

${STRUCT_VERTEX_OUTPUT}

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var<uniform> mouse: Mouse;
@group(2) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(3) @binding(0) var input_texture_xy: texture_2d<f32>;
@group(3) @binding(1) var velocity_input_texture_xy: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec2<f32> {
  
    ${ FRAGMENT_VELOCITY_START }
    
    var velocity = textureLoad(velocity_input_texture_xy, pos).xy;

    var x = pos.x - uDt * grid_info.simSpatialStep * velocity.x;
    var y = pos.y - uDt * grid_info.simSpatialStep * velocity.y;

    if (x < 0) { 
      x = 0; 
    } else if (x >= grid_info.simWidth - 1) {
       x = grid_info.simWidth - 1; 
    }
    if (y < 0) { 
      y = 0; 
    } else if (y >= grid_info.simHeight - 1) { 
      y = grid_info.simHeight - 1; 
    }

    let x1 = floor(x);
    let y1 = floor(y);
    let x2 = x1 + 1;
    let y2 = y1 + 1;

    let TL = textureLoad(input_texture_xy, vec2<u32>(x1, y2)) 
    let TR = textureLoad(input_texture_xy, vec2<u32>(x2, y2)) 
    let BL = textureLoad(input_texture_xy, vec2<u32>(x1, y1)) 
    let BR = textureLoad(input_texture_xy, vec2<u32>(x2, y1)) 

    let xMod = fract(x);
    let yMod = fract(y);
    
    let bilerp = mix( mix(BL, BR, xMod), mix(TL, TR, xMod), yMod );

    return vec2<f32>(bilerp.x, bilerp.y);
}`

export const advectDyeShader = /* wgsl */`

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var<uniform> mouse: Mouse;
@group(2) @binding(0) var<uniform> uniforms: SplatUniforms
@group(3) @binding(0) var dye_input_texture_xyz: texture_2d<f32>;
@group(3) @binding(1) var velocity_input_texture_xy: texture_2d<f32>;

${IDFunc('grid_info.dyeWidth')}

fn in(x : f32, y : f32) -> vec3<f32> { let id = ID(x, y); return vec3(x_in[id], y_in[id], z_in[id]); }
fn vel(x : f32, y : f32) -> vec2<f32> { 
  let id = u32(i32(x) + i32(y) * i32(grid_info.simWidth));
  return vec2(x_vel[id], y_vel[id]);
}

fn vel_bilerp(x0 : f32, y0 : f32) -> vec2<f32> {
    var x = x0 * grid_info.simWidth / grid_info.dyeWidth;
    var y = y0 * grid_info.simHeight / grid_info.dyeHeight;

    if (x < 0) { x = 0; }
    else if (x >= grid_info.simWidth - 1) { x = grid_info.simWidth - 1; }
    if (y < 0) { y = 0; }
    else if (y >= grid_info.simHeight - 1) { y = grid_info.simHeight - 1; }

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

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
    ${ FRAGMENT_DYE_START }
    let V = vel_bilerp(pos.x, pos.y);
    var x = pos.x - uDt * grid_info.dyeSpacialStep * V.x;
    var y = pos.y - uDt * grid_info.dyeSpacialStep * V.y;
    if (x < 0) { 
      x = 0; 
    } else if (x >= grid_info.dyeWidth - 1) {
       x = grid_info.dyeWidth - 1; 
    }
    if (y < 0) { 
      y = 0; 
    } else if (y >= grid_info.dyeHeight - 1) { 
      y = grid_info.dyeHeight - 1; 
    }

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

    return vec4<f32>(bilerp, 1.0);
}`

/// DIVERGENCE SHADER ///

export const divergenceShader = /* wgsl */`   

${STRUCT_VERTEX_OUTPUT}

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var velocity_input_texture_xy: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}
fn vel(x : f32, y : f32) -> vec2<f32> { let id = ID(x, y); return vec2(x_vel[id], y_vel[id]); }

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) f32 {

  ${ FRAGMENT_VELOCITY_START }

  let L = vel(pos.x - 1, pos.y).x;
  let R = vel(pos.x + 1, pos.y).x;
  let B = vel(pos.x, pos.y - 1).y;
  let T = vel(pos.x, pos.y + 1).y;

  var divergence = 0.5 * grid_info.simSpatialStep * ((R - L) + (T - B));
  return divergence
}`

/// PRESSURE SHADER ///

export const pressureShader = /* wgsl */`

${STRUCT_VERTEX_OUTPUT}

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var pressure_texture_x: texture_2d<f32>;
@group(1) @binding(1) var divergence_texture_x: texture_2d<f32>; 

${IDFunc('grid_info.simWidth')}
fn in(x : f32, y : f32) -> f32 { let id = ID(x, y); return pres_in[id]; }

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) f32 {

  ${ FRAGMENT_VELOCITY_START }
        
  let L = pos - vec2(1, 0);
  let R = pos + vec2(1, 0);
  let B = pos - vec2(0, 1);
  let T = pos + vec2(0, 1);

  let Lx = in(L.x, L.y);
  let Rx = in(R.x, R.y);
  let Bx = in(B.x, B.y);
  let Tx = in(T.x, T.y);

  let bC = div[index];

  let alpha = -(grid_info.dx * grid_info.dx);
  let rBeta = .25;

  var pressure = (Lx + Rx + Bx + Tx + alpha * bC) * rBeta;
  return pressure;
}`

/// GRADIENT SUBTRACT SHADER ///

export const gradientSubtractShader = /* wgsl */`     

${STRUCT_VERTEX_OUTPUT}

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var pressure: texture_2d<f32>;
@group(1) @binding(1) var vel_texture_xy: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

fn pres(x : f32, y : f32) -> f32 { let id = ID(x, y); return pressure[id]; }

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec2<f32> {

  ${ FRAGMENT_VELOCITY_START }

  let L = pos - vec2(1, 0);
  let R = pos + vec2(1, 0);
  let B = pos - vec2(0, 1);
  let T = pos + vec2(0, 1);

  let xL = pres(L.x, L.y);
  let xR = pres(R.x, R.y);
  let yB = pres(B.x, B.y);
  let yT = pres(T.x, T.y);
  
  // If gradient increases to the right, then fluid will be pushed left
  let xTendency = textureLoad(vel_texture_xy, pos).x - .5 * grid_info.simSpatialStep * (xR - xL);
  // If gradient increases above, then fluid will be pushed down
  let yTendency = textureLoad(vel_texture_xy, pos).y - .5 * grid_info.simSpatialStep * (yT - yB);

  return vec2<f32>(xTendency, yTendency);

}`

/// VORTICITY SHADER ///

export const vorticityShader = /* wgsl */`      

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var velocity_input_texture_xy: texture_2d<f32>;
@group(1) @binding(1) var vorticity: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}
fn vel(x : f32, y : f32) -> vec2<f32> { 
  let id = ID(x, y); 
  return vec2(x_vel[id], y_vel[id]); 
}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) f32 {

  ${ FRAGMENT_VELOCITY_START }

  //Get the velocities around the current pixel
  let Ly = vel(pos.x - 1, pos.y).y;
  let Ry = vel(pos.x + 1, pos.y).y;
  let Bx = vel(pos.x, pos.y - 1).x;
  let Tx = vel(pos.x, pos.y + 1).x;

  // Curl of a velocity field is the difference between derivative of velocities
  // Central difference approximation of a 2d velocity vector is ∂f/∂x ≈ (v(x+h) - v(x-h)) / (2h)
  // Applied to our velocity vectors...
  //  1. Ry-Ly is an approximation of ∂u/dy 
  //  2. Tx-Bx is an approximation of ∂v/dx
  //  3. texelSize is our nudge h, multiplied by 2

  var vorticity = 0.5 * grid_info.simSpatialStep * ((Ry - Ly) - (Tx - Bx));

  return vorticity;
}`

export const vorticityConfinmentShader = `      

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(2) @binding(0) var velocity_input_texture_xy: texture_2d<f32>;
@group(2) @binding(1) var vorticity: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}
fn vort(x : f32, y : f32) -> f32 { let id = ID(x, y); return vorticity[id]; }

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {

  ${ FRAGMENT_VELOCITY_START }

  //Get vorticity of surrounding pixels 
  let L = vort(pos.x - 1, pos.y);
  let R = vort(pos.x + 1, pos.y);
  let B = vort(pos.x, pos.y - 1);
  let T = vort(pos.x, pos.y + 1);
  let C = vorticity[index];

  //Get delta vorticity in x and y directions.
  var vert_vorticity = abs(T) - abs(B);
  var hor_vorticity = abs(R) - abs(L);
  //Get gradient of vorticity
  var force = 0.5 * grid_info.simSpatialStep * vec2(vert_vorticity, hor_vorticity);

  let epsilon = 2.4414e-4;
  //Get magnitude of vorticity force
  let magSqr = max(epsilon, dot(force, force));

  // Normalize force by its magnitude
  force = force / sqrt(magSqr);
  //NOTE: Change vec2(1, -1) if y-axis is different direction
  force *= grid_info.dx * uVorticity * uDt * C * vec2(1, -1);

  x_vel_out[index] = x_vel_in[index] + force.x;
  y_vel_out[index] = y_vel_in[index] + force.y;
}`

export const clearPressureShader = /* wgsl */`  

${STRUCT_VERTEX_OUTPUT}

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(2) @binding(0) var input_texture_x: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) f32 {

  ${ FRAGMENT_START_ALL }
  
  return textureLoad(input_texture_x, pos).x * uniforms.viscosity;

}`

export const boundaryShader = /* wgsl */`

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(2) @binding(0) var input_texture_xy: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec2<f32> {

  ${ FRAGMENT_START_ALL }

  // disable scale to disable contained bounds
  var scaleX = 1.;
  var scaleY = 1.;

  if (pos.x == 0) { pos.x += 1; scaleX = -1.; }
  else if (pos.x == grid_info.simWidth - 1) { pos.x -= 1; scaleX = -1.; }
  if (pos.y == 0) { pos.y += 1; scaleY = -1.; }
  else if (pos.y == grid_info.simHeight - 1) { pos.y -= 1; scaleY = -1.; }

  if (containFluid == 0.) {
    scaleX = 1.;
    scaleY = 1.;
  }

  var x = textureLoad(input_texture_xy, pos).x * scaleX
  var y = textureLoad(input_texture_xy, pos).y * scaleY

  return vec2<f32>(x, y);
}`

/// BOUNDARY PRESSURE SHADER ///

export const boundaryPressureShader = /* wgsl */`    

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var input_texture_x: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {

  ${ FRAGMENT_START_ALL }

  if (pos.x == 0) { 
    pos.x += 1; 
  } else if (pos.x == grid_info.simWidth - 1) { 
    pos.x -= 1; 
  }
  if (pos.y == 0) { 
    pos.y += 1; 
  } else if (pos.y == grid_info.simHeight - 1) { 
    pos.y -= 1; 
  }

  return textureLoad(input_texture_x, pos).x;
}`

export const FinalOutputShader = `

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(2) @binding(0) var dye_texture: texture_2d<f32>;

@fragment
fn fragment_main(input: VertexBaseOutput) -> @location(0) vec4<f32>
{
  var w = grid_info.dyeWidth;
  var h = grid_info.dyeHeight;

  let fuv = vec2<f32>((floor(fragData.uv*vec2(w, h))));
  let id = u32(fuv.x + fuv.y * w);

  var color = textureLoad(dye_texture, id).xyz;
  return vec4(color, 1.0);
}
`;
