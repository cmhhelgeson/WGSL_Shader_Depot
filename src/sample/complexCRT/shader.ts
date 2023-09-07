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

export const ComplexCRTExplanations = [
  "For this shader, the y axis of WebGPU's NDC Coordinates are flipped",
  "This means (-1, -1) is at the upper left of the screen rather than the bottom left",
  'Our first step is to get the dot product of input.v_uv by input.v_uv.',
  'The dot product of a vector by itself gets us the square of its magnitude from the origin.',
  'Accordingly our magnitude increases the further away from the center of the screen',
  'We then decrease the squared magnitude from the origin at each point by 1...',
  '...and multiply by the screenCurvature',
  'Once our uvs are set, we can use them to derive our canvas pixel coordinates',
  'If you only see yellow, do not be worried. Pixels peak beyond the range of 0.0 to 1.0 used to represent color in our vec3 output.',
  'If working with pixels, take the output\'s fractional component to get a better sense of what\'s going on.',
  'Get the coordinates of each CRT phosphor cell by dividing the pixel value by the cellSize.',
  'Further subdivide each phosphor cell on the x-axis to get the positions of each cell\'s red, green, blue sub-cells',
  'Final output',
]

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
    ${createDebugStepArea({ start: 2, end: 4 }, 1, 'dot(input.v_uv, input.v_uv)')}
    ${createDebugStepArea({ start: 5, end: 5 }, 1, 'dot(input.v_uv, input.v_uv) - 1')}
    ${createDebugStepArea({ start: 6, end: 6 }, 1, '(dot(input.v_uv, input.v_uv) - 1) * uniforms.screenCurvature')}
    ${createDebugStepArea({ start: 7, end: 8 }, 2, 'pixel')}
    ${createDebugStepArea({ start: 9, end: 9 }, 2, 'vec2<f32>(fract(pixel.x), fract(pixel.y))')}
    ${createDebugStepArea({ start: 10, end: 10}, 2, 'vec2<f32>(fract(coord.x), fract(subcoord.y))')}
    ${createDebugStepArea({ start: 11, end: 11 }, 2, 'vec2<f32>(fract(subcoord.x), fract(subcoord.y))')}
    return vec4<f32>(color, 1.0);
  ` : `return vec4<f32>(color, 1.0);`
  }
}
`;
};
