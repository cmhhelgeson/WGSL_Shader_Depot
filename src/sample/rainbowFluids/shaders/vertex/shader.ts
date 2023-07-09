/* eslint-disable prettier/prettier */

import { 
  STRUCT_VERTEX_OUTPUT,
  STRUCT_GRID_INFO,
  STRUCT_MOUSE,
  STRUCT_SPLAT_UNIFORMS
} from "./shaderStruct";

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
  output.uv = uv[VertexIndex];
  output.Position = vec4f(pos[VertexIndex], 0.0, 1.0);
  return output;
}
`;


const FRAGMENT_START = (
  width: string,
  height: string,
) => {return `
//Get pixel coordinates on texture
var pos = vec2<f32>(
  floor(input.uv.x * ${width}), floor(input.uv.y * ${height})
);`}

const FRAGMENT_VELOCITY_START = FRAGMENT_START(
  'grid_info.simWidth',
  'grid_info.simHeight',
);

const FRAGMENT_DYE_START = FRAGMENT_START(
  'grid_info.dyeWidth',
  'grid_info.dyeHeight',
);

// This code initialize the pos and index variables and target all cells
const FRAGMENT_START_ALL = `    
var pos = vec2<f32>(
  floor(input.uv.x * grid_info.canvasWidth), floor(input.uv.y * grid_info.canvasHeight)
);`


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

/// APPLY FORCE SHADER ///

export const updateVelocityShader = /* wgsl */`

${STRUCT_VERTEX_OUTPUT}
${ STRUCT_GRID_INFO }
${STRUCT_MOUSE}
${STRUCT_SPLAT_UNIFORMS}

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var<uniform> mouse: Mouse;
@group(2) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(3) @binding(0) var prev_velocity: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

${InBoundsFunc('grid_info.simWidth', 'grid_info.simHeight')}

fn createSplat(pos: vec2<f32>, splatPos: vec2<f32>, vel : vec2<f32>, radius: f32) -> vec2<f32> {
  //Distance of pixel from splatCenter
  var p = pos - splatPos;
  p.x *= grid_info.simWidth / grid_info.simHeight;
  var v = vel;
  v.x *= grid_info.simWidth / grid_info.simHeight;
  var splat = exp(-dot(p, p) / radius) * v;
  return splat;
}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec2<f32> {
    
    //Check whether the position of the fragment is withint the bounds of our texture
    ${ FRAGMENT_VELOCITY_START }

    var p = pos/vec2(grid_info.simWidth, grid_info.simHeight);

    var splat = createSplat(p, mouse.pos, mouse.vel * 2.0, uniforms.vel_radius);

    splat *= uniforms.vel_force * uniforms.dt * 200.0;
    
    var textureOutput: vec2<f32> = textureLoad(
      prev_velocity,
      vec2<u32>(u32(pos.x), u32(pos.y)),
      0
    ).xy;

    var output = vec2<f32>(
      textureOutput.x * uniforms.vel_diff + splat.x,
      textureOutput.y * uniforms.vel_diff + splat.y
    );
    
    return vec2<f32>(output);
}`

export const updateDyeShader = /* wgsl */`
${STRUCT_VERTEX_OUTPUT}
${ STRUCT_GRID_INFO }
${ STRUCT_MOUSE }
${STRUCT_SPLAT_UNIFORMS}

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var<uniform> mouse: Mouse;
@group(2) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(3) @binding(0) var dye: texture_2d<f32>;

${IDFunc('grid_info.dyeWidth')}

${InBoundsFunc('grid_info.dyeWidth', 'grid_info.dyeHeight')}

// cosine based palette, 4 vec3 params
fn palette(t : f32, a : vec3<f32>, b : vec3<f32>, c : vec3<f32>, d : vec3<f32> ) -> vec3<f32> {
    return a + b*cos( 6.28318*(c*t+d) );
}

fn createSplat(pos: vec2<f32>, splatPos: vec2<f32>, vel : vec2<f32>, radius: f32) -> vec3<f32> {
  //Distance of pixel from splatCenter
  var p = pos - splatPos;
  p.x *= grid_info.simWidth / grid_info.simHeight;
  var v = vel;
  v.x *= grid_info.simWidth / grid_info.simHeight;
  var splat = exp(-dot(p, p) / radius) * length(v);
  return vec3<f32>(splat);
}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {

    ${ FRAGMENT_DYE_START }

    let col_incr = 0.15;
    let col_start = palette(uniforms.time/8., vec3(1), vec3(0.5), vec3(1), vec3(0, col_incr, col_incr*2.));

    var p = pos/vec2(grid_info.dyeWidth, grid_info.dyeHeight);

    var splat = createSplat(p, mouse.pos, mouse.vel * 2.0, uniforms.dye_radius);

    splat *= col_start * uniforms.dye_force * uniforms.dt * 100.0;

    var flatPos = vec2<u32>(u32(pos.x), u32(pos.y));

    var color = textureLoad(
      dye, 
      flatPos,
      0
    ).xyz;

    color.x = max(0.0, color.x * uniforms.dye_diff + splat.x);
    color.y = max(0.0, color.y * uniforms.dye_diff + splat.y);
    color.z = max(0.0, color.z * uniforms.dye_diff + splat.z);

    return vec4<f32>(color, 1.0);
}`;


/// ADVECT SHADER ///

export const advectShader = /* wgsl */`

${STRUCT_VERTEX_OUTPUT}

${ STRUCT_GRID_INFO }
${STRUCT_MOUSE}
${STRUCT_SPLAT_UNIFORMS}

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(2) @binding(0) var input_texture: texture_2d<f32>;
@group(2) @binding(1) var prev_velocity: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec2<f32> {
  
    ${ FRAGMENT_VELOCITY_START }
    
    var velocity = textureLoad(
      prev_velocity, 
      vec2<u32>(u32(pos.x), u32(pos.y)),
      0
    ).xy;

    var x = pos.x - uniforms.dt * grid_info.simSpatialStep * velocity.x;
    var y = pos.y - uniforms.dt * grid_info.simSpatialStep * velocity.y;

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

    let TL = textureLoad(
      input_texture, 
      vec2<u32>(u32(x1), u32(y2)),
      0
    ).xy;
    let TR = textureLoad(
      input_texture, 
      vec2<u32>(u32(x2), u32(y2)),
      0
    ).xy; 
    let BL = textureLoad(
      input_texture, 
      vec2<u32>(u32(x1), u32(y1)),
      0
    ).xy; 
    let BR = textureLoad(
      input_texture, 
      vec2<u32>(u32(x2), u32(y1)),
      0
    ).xy; 

    let xMod = fract(x);
    let yMod = fract(y);
    
    let bilerp = mix( mix(BL, BR, xMod), mix(TL, TR, xMod), yMod );

    return vec2<f32>(bilerp.x, bilerp.y);
}`

export const advectDyeShader = /* wgsl */`

${ STRUCT_GRID_INFO }
${STRUCT_MOUSE}
${STRUCT_VERTEX_OUTPUT}
${STRUCT_SPLAT_UNIFORMS}

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var<uniform> mouse: Mouse;
@group(2) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(3) @binding(0) var dye: texture_2d<f32>;
@group(3) @binding(1) var velocity: texture_2d<f32>;

${IDFunc('grid_info.dyeWidth')}

fn vel_bilerp(x0 : f32, y0 : f32) -> vec2<f32> {
    var x = x0 * grid_info.simWidth / grid_info.dyeWidth;
    var y = y0 * grid_info.simHeight / grid_info.dyeHeight;

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

    let TL = textureLoad(
      velocity, 
      vec2<u32>(u32(x1), u32(y2)),
      0
    ).xy;
    let TR = textureLoad(
      velocity, 
      vec2<u32>(u32(x2), u32(y2)), 
      0
    ).xy;
    let BL = textureLoad(
      velocity, 
      vec2<u32>(u32(x1), u32(y1)), 
      0
    ).xy;
    let BR = textureLoad(
      velocity, 
      vec2<u32>(u32(x2), u32(y1)), 
      0
    ).xy;

    let xMod = fract(x);
    let yMod = fract(y);

    return mix( mix(BL, BR, xMod), mix(TL, TR, xMod), yMod );
}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32> {
    ${ FRAGMENT_DYE_START }
    let V = vel_bilerp(pos.x, pos.y);
    var x = pos.x - uniforms.dt * grid_info.dyeSpacialStep * V.x;
    var y = pos.y - uniforms.dt * grid_info.dyeSpacialStep * V.y;
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

    let TL = textureLoad(
      dye, 
      vec2<u32>(u32(x1), u32(y2)),
      0
    ).xyz;
    let TR = textureLoad(
      dye, 
      vec2<u32>(u32(x2), u32(y2)),
      0
    ).xyz;
    let BL = textureLoad(
      dye, 
      vec2<u32>(u32(x1), u32(y1)),
      0
    ).xyz;
    let BR = textureLoad(
      dye, 
      vec2<u32>(u32(x2), u32(y1)),
      0
    ).xyz;

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
@group(1) @binding(0) var velocity: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) f32 {

  ${ FRAGMENT_VELOCITY_START }

  let L = textureLoad(
    velocity, 
    vec2<u32>(u32(pos.x - 1), u32(pos.y)),
    0
  ).x;
  let R = textureLoad(
    velocity, 
    vec2<u32>(u32(pos.x + 1), u32(pos.y)),
    0
  ).x;
  let B = textureLoad(
    velocity, 
    vec2<u32>(u32(pos.x), u32(pos.y - 1)),
    0
  ).y;
  let T = textureLoad(
    velocity, 
    vec2<u32>(u32(pos.x), u32(pos.y + 1)),
    0
  ).y;

  var divergence = 0.5 * grid_info.simSpatialStep * ((R - L) + (T - B));
  return divergence;
}`

/// PRESSURE SHADER ///

export const pressureShader = /* wgsl */`

${STRUCT_VERTEX_OUTPUT}

${ STRUCT_GRID_INFO }

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var pressure_texture_x: texture_2d<f32>;
@group(1) @binding(1) var divergence_texture_x: texture_2d<f32>; 

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) f32 {

  ${ FRAGMENT_VELOCITY_START }
        
  let L = pos - vec2(1, 0);
  let R = pos + vec2(1, 0);
  let B = pos - vec2(0, 1);
  let T = pos + vec2(0, 1);

  let Lx = textureLoad(
    pressure_texture_x, 
    vec2<u32>(u32(L.x), u32(L.y)),
    0
  ).x;
  let Rx = textureLoad(
    pressure_texture_x, 
    vec2<u32>(u32(R.x), u32(L.y)),
    0
  ).x;
  let Bx = textureLoad(
    pressure_texture_x, 
    vec2<u32>(u32(B.x), u32(L.y)),
    0
  ).x;
  let Tx = textureLoad(
    pressure_texture_x, 
    vec2<u32>(u32(T.x), u32(L.y)),
    0
  ).x;

  let bC = textureLoad(
    divergence_texture_x, 
    vec2<u32>(u32(pos.x), u32(pos.y)),
    0
  ).x;

  let alpha = -(grid_info.simReciprocal * grid_info.simReciprocal);
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


@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec2<f32> {

  ${ FRAGMENT_VELOCITY_START }

  let L = pos - vec2(1, 0);
  let R = pos + vec2(1, 0);
  let B = pos - vec2(0, 1);
  let T = pos + vec2(0, 1);

  let xL = textureLoad(
    pressure, 
    vec2<u32>(u32(L.x), u32(L.y)),
    0
  ).x;
  let xR = textureLoad(
    pressure, 
    vec2<u32>(u32(R.x), u32(R.y)),
    0
  ).x;
  let yB = textureLoad(
    pressure, 
    vec2<u32>(u32(B.x), u32(B.y)),
    0
  ).x;
  let yT = textureLoad(
    pressure, 
    vec2<u32>(u32(T.x), u32(B.y)),
    0
  ).x;
  
  // If gradient increases to the right, then fluid will be pushed left
  let tendency = textureLoad(
    vel_texture_xy, 
    vec2<u32>(u32(pos.x), u32(pos.y)),
    0
  ).xy;
  let xTendency = tendency.x - .5 * grid_info.simSpatialStep * (xR - xL);
  // If gradient increases above, then fluid will be pushed down
  let yTendency = tendency.y - .5 * grid_info.simSpatialStep * (yT - yB);

  return vec2<f32>(xTendency, yTendency);

}`

/// VORTICITY SHADER ///

export const vorticityShader = /* wgsl */`      

${ STRUCT_GRID_INFO }
${STRUCT_VERTEX_OUTPUT}

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var velocity: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) f32 {

  ${ FRAGMENT_VELOCITY_START }

  //Get the velocities around the current pixel
  let Ly = textureLoad(
    velocity, 
    vec2<u32>(u32(pos.x - 1), u32(pos.y)),
    0
  ).y;
  let Ry = textureLoad(
    velocity, 
    vec2<u32>(u32(pos.x + 1), u32(pos.y)),
    0
  ).y;
  let Bx = textureLoad(
    velocity, 
    vec2<u32>(u32(pos.x), u32(pos.y - 1)),
    0
  ).x;
  let Tx = textureLoad(
    velocity, 
    vec2<u32>(u32(pos.x), u32(pos.y + 1)),
    0
  ).x;

  // Curl of a velocity field is the difference between derivative of velocities
  // Central difference approximation of a 2d velocity vector is ∂f/∂x ≈ (v(x+h) - v(x-h)) / (2h)
  // Applied to our velocity vectors...
  //  1. Ry-Ly is an approximation of ∂u/dy 
  //  2. Tx-Bx is an approximation of ∂v/simReciprocal
  //  3. texelSize is our nudge h, multiplied by 2

  var vorticity = 0.5 * grid_info.simSpatialStep * ((Ry - Ly) - (Tx - Bx));

  return vorticity;
}`

export const vorticityConfinmentShader = `      

${ STRUCT_GRID_INFO }
${STRUCT_VERTEX_OUTPUT}
${STRUCT_SPLAT_UNIFORMS}

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(2) @binding(0) var velocity_input_texture_xy: texture_2d<f32>;
@group(2) @binding(1) var vorticity: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}
//fn vort(x : f32, y : f32) -> f32 { let id = ID(x, y); return vorticity[id]; }

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec2<f32> {

  ${ FRAGMENT_VELOCITY_START }

  //Get vorticity of surrounding pixels 
  let L = textureLoad(
    vorticity, 
    vec2<u32>(u32(pos.x - 1), u32(pos.y)),
    0
  ).x;
  let R = textureLoad(
    vorticity, 
    vec2<u32>(u32(pos.x + 1), u32(pos.y)),
    0
  ).x;
  let B = textureLoad(
    vorticity, 
    vec2<u32>(u32(pos.x), u32(pos.y - 1)),
    0
  ).x;
  let T = textureLoad(
    vorticity, 
    vec2<u32>(u32(pos.x), u32(pos.y + 1)),
    0
  ).x;
  let C = textureLoad(
    vorticity, 
    vec2<u32>(u32(pos.x), u32(pos.y)),
    0
  ).x;

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
  force *= grid_info.simReciprocal * uniforms.vorticity * uniforms.dt * C * vec2(1, -1);

  var velocity = textureLoad(
    velocity_input_texture_xy, 
    vec2<u32>(u32(pos.x), u32(pos.y)),
    0
  ).xy;

  return vec2<f32>(velocity + force);
}`

export const clearPressureShader = /* wgsl */`  

${STRUCT_VERTEX_OUTPUT}

${ STRUCT_GRID_INFO }
${STRUCT_SPLAT_UNIFORMS}

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(2) @binding(0) var input_texture: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) f32 {

  ${ FRAGMENT_START_ALL }
  
  return textureLoad(
    input_texture, 
    vec2<u32>(u32(pos.x), u32(pos.y)),
    0
  ).x * uniforms.viscosity;

}`

export const boundaryShader = /* wgsl */`

${ STRUCT_GRID_INFO }
${STRUCT_VERTEX_OUTPUT}
${STRUCT_SPLAT_UNIFORMS}

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var<uniform> uniforms: SplatUniforms;
@group(2) @binding(0) var input_texture: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec2<f32> {

  ${ FRAGMENT_START_ALL }

  // disable scale to disable contained bounds
  var scaleX = 1.0;
  var scaleY = 1.0;

  if (pos.x == 0) { 
    pos.x += 1; scaleX = -1.; 
  } else if (pos.x == grid_info.simWidth - 1) { 
    pos.x -= 1; scaleX = -1.; 
  }
  if (pos.y == 0) { 
    pos.y += 1; scaleY = -1.; 
  } else if (pos.y == grid_info.simHeight - 1) { 
    pos.y -= 1; scaleY = -1.; 
  }

  if (uniforms.containFluid == 0.) {
    scaleX = 1.;
    scaleY = 1.;
  }

  var x = textureLoad(
    input_texture, 
    vec2<u32>(u32(pos.x), u32(pos.y)),
    0
  ).x * scaleX;
  var y = textureLoad(
    input_texture, 
    vec2<u32>(u32(pos.x), u32(pos.y)),
    0
  ).y * scaleY;

  return vec2<f32>(x, y);
}`

/// BOUNDARY PRESSURE SHADER ///

export const boundaryPressureShader = /* wgsl */`    

${ STRUCT_GRID_INFO }
${STRUCT_VERTEX_OUTPUT}

@group(0) @binding(0) var<uniform> grid_info : GridInfo;
@group(1) @binding(0) var input_texture: texture_2d<f32>;

${IDFunc('grid_info.simWidth')}

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) f32 {

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

  return textureLoad(
    input_texture, 
    vec2<u32>(u32(pos.x), u32(pos.y)),
    0
  ).x;
}`

export const FinalOutputShader = `

${STRUCT_GRID_INFO}
${STRUCT_VERTEX_OUTPUT}
${STRUCT_SPLAT_UNIFORMS}

@group(0) @binding(0) var<uniform> grid_info: GridInfo;
@group(1) @binding(0) var dye_texture: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexBaseOutput) -> @location(0) vec4<f32>
{
  var w = grid_info.dyeWidth;
  var h = grid_info.dyeHeight;

  let fuv = vec2<f32>((floor(input.uv*vec2(w, h))));
  let id = u32(fuv.x + fuv.y * w);

  var color = textureLoad(
    dye_texture, 
    vec2<u32>(u32(fuv.x), u32(fuv.y)),
    0
  ).xyz;
  return vec4(color, 1.0);
}
`;
