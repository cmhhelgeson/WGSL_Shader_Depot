/* eslint-disable prettier/prettier */
import { createWGSLUniform } from '../../utils/shaderUtils';
import { createDebugStepArea,  } from '../../utils/shaderUtils';

export const argKeys = [
  'canvasWidth',
  'canvasHeight',
  'cellOffset',
  'cellSize',
  'borderMask',
  'time',
  'debugStep',
  'screenCurvature',
  'zoom',
];

const s1Exp = [
  "For this shader, the y axis of WebGPU's NDC Coordinates are flipped",
  "This means (-1, -1) is at the upper left of the screen rather than the bottom left",
]

const s2Exp = [
  'Our first step is to get the dot product of input.v_uv by input.v_uv.',
  'The dot product of a vector by itself gets us the square of its magnitude from the origin.',
  'Accordingly, the magnitude increases the further away the pixel is from the center of the screen.',
  'Magnitudes from the center currently lie between 0->2. Our screenCuravture transformation will become stronger at the edges...',
  'However we want our effect to work in the inverse towards the center, then normally at the edges',
]

const s3Exp = [
  'To do this, we bring our 0->2 range of magnitudes into a range of -1->1...',
]

const s4Exp = [
  '...and only then do we multiply by the screenCurvature.',
]

const s5Exp = [
  'color'
]

const s6Exp = [
  'add zoom step'
]

const s7Exp = [
  'Multiply by v_uv to get uv step',
  'Try setting the zoom and screenCuravture individually to see how each affects the final uvs',
]

const s8Exp = [
  'Once our uvs are set, we can use them to derive our canvas pixel coordinates',
  'If you only see yellow, do not be worried. Pixels peak beyond the range of 0.0 to 1.0 used to represent color in our vec3 output.',
]

const s9Exp = [
  'If working with pixels, take the output\'s fractional component to get a better sense of what\'s going on.',
]

const s10Exp = [
  'Get the coordinates of each CRT phosphor cell by dividing the pixel value by the cellSize.',
]

const s11Exp = [
  'Further subdivide each phosphor cell on the x-axis to get the positions of each cell\'s red, green, blue sub-cells',
]



export const ComplexCRTExplanations = [
  ...s1Exp,
  ...s2Exp,
  ...s3Exp,
  ...s4Exp,
  ...s5Exp,
  ...s6Exp,
  ...s7Exp,
  ...s8Exp,
  ...s9Exp,
  ...s10Exp,
  'Further subdivide each phosphor cell on the x-axis to get the positions of each cell\'s red, green, blue sub-cells',
  'Final output',
]

interface Step {
  exps: string[],
  size: 1 | 2 | 3 | 4,
  val: string,
}

const DebugAreaTestFunc = (steps: Step[]): string => {
  let retString = ``;
  let stepsCompleted = 0;
  for (const step of steps) {
    const {exps, size, val} = step;
    retString += createDebugStepArea(
      {start: stepsCompleted, end: stepsCompleted + exps.length - 1},
      size,
      val
    )
    stepsCompleted = stepsCompleted + exps.length - 1;
  }
  return retString;
}

DebugAreaTestFunc([
  {exps: s1Exp, size: 2, val: 'input.v_uv'},
  {exps: s2Exp, size: 2, val: 'input.v_uv'},

])

export const ComplexCRTShader = (debug: boolean) => {
  return `
${createWGSLUniform('Uniforms', argKeys)}
${debug ? '' : ''}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var image_sampler: sampler;
@group(0) @binding(2) var diffuse: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  //Zoom effect hack, doesn't work past certain screen curvatures
  //Add select statement at -1.0 to show what would happen if -1.0 was - 0.0
  var uv = input.v_uv * (uniforms.zoom + (dot(input.v_uv,input.v_uv) - 1.0) * uniforms.screenCurvature);
  var pixel = (uv * 0.5 + 0.5) * vec2<f32>(
    uniforms.canvasWidth, 
    uniforms.canvasHeight
  );

  var coord = pixel / uniforms.cellSize;

  var subcoord = coord * vec2<f32>(select(uniforms.cellSize, 3.0, uniforms.cellSize >= 6.0), 1);

  var cell_offset = vec2<f32>(0, fract(floor(coord.x) * uniforms.cellOffset));

  var mask_coord = floor(coord + cell_offset) * uniforms.cellSize;

  var samplePoint = mask_coord / vec2<f32>(uniforms.canvasWidth, uniforms.canvasHeight);

  var abberation = textureSample(
    diffuse,
    image_sampler,
    samplePoint
  ).xyz;

  var color = abberation;

  //current implementation does not give an even amount of space to each r, g, b unit of a cell
  //Fix/hack this by multiplying subCoord.x by cellSize at cellSizes below 6
  var ind = floor(subcoord.x) % 3;

  var mask_color = vec3<f32>(
    f32(ind == 0.0), 
    f32(ind == 1.0), 
    f32(ind == 2.0)
  ) * 3.0;

  var cell_uv = fract(subcoord + cell_offset) * 2.0 - 1.0;
  var border: vec2<f32> = 1.0 - cell_uv * cell_uv * uniforms.borderMask;

  mask_color *= vec3f(clamp(border.x, 0.0, 1.0) * clamp(border.y, 0.0, 1.0));

  color *= vec3f(1.0 + (mask_color - 1.0) * 1.0);

  ${
    debug
      ? `
    ${createDebugStepArea({ start: 0, end: 1 }, 2, 'input.v_uv')}
    ${createDebugStepArea({ start: 2, end: 6 }, 1, 'dot(input.v_uv, input.v_uv)')}
    ${createDebugStepArea({ start: 7, end: 7 }, 1, 'dot(input.v_uv, input.v_uv) - 1')}
    ${createDebugStepArea({ start: 8, end: 8 }, 1, '(dot(input.v_uv, input.v_uv) - 1) * uniforms.screenCurvature')}
    ${createDebugStepArea({ start: 9, end: 9 }, 3, 'color')}
    ${createDebugStepArea({ start: 10, end: 10 }, 1, 'uniforms.zoom + (dot(input.v_uv, input.v_uv) - 1) * uniforms.screenCurvature')}
    ${createDebugStepArea({ start: 11, end: 12 }, 2, 'uv')}
    ${createDebugStepArea({ start: 13, end: 14 }, 2, 'pixel')}
    ${createDebugStepArea({ start: 15, end: 15 }, 2, 'vec2<f32>(fract(pixel.x), fract(pixel.y))')}
    ${createDebugStepArea({ start: 16, end: 16 }, 2, 'vec2<f32>(fract(coord.x), fract(subcoord.y))')}
    ${createDebugStepArea({ start: 17, end: 17 }, 2, 'vec2<f32>(fract(subcoord.x), fract(subcoord.y))')}
    return vec4<f32>(color, 1.0);
  ` : `return vec4<f32>(color, 1.0);`
  }
}
`;
};

/*    ${DebugAreaTestFunc([
      {exps: s1Exp, size: 2, val: 'input.v_uv'},
      {exps: s2Exp, size: 1, val: 'dot(input.v_uv, input.v_uv)'},
      {exps: s3Exp, size: 1, val: 'dot(input.v_uv, input.v_uv) - 1'},
      {exps: s4Exp, size: 2, val: '(dot(input.v_uv, input.v_uv) - 1) * uniforms.screenCurvature'},

    ])} */