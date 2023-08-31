import { createWGSLUniform } from '../../utils/shaderUtils';

export const argKeys = [
  'canvasWidth',
  'canvasHeight',
  'cellOffset',
  'cellSize',
  'borderMask',
  'time',
  'debugStep',
  'screenCurvature',
];

export const ComplexCRTExplanations = [
  "For this shader, the y axis of WebGPU's NDC Coordinates are flipped",
  "This means (-1, -1) is at the upper left of the screen rather than the bottom left",
  'Our first step is to get the dot product of input.v_uv by input.v_uv.',
  'The dot product of a vector by itself gets us the square of its magnitude from the origin.',
  'Accordingly our magnitude increases the further away from the center of the screen',
  'We then decrease the squared magnitude from the origin at each point by 1',
  'Output of dot -1 * curve',
  'Output of var pixel',
  'Output of var coord',
  'Output of var subcoord',
  'Final output',
]

interface StepRange {
  start: number;
  end: number;
}

const createDebugStepReturnStatement = (
  dataSize: 1 | 2 | 3 | 4,
  value: string
) => {
  switch (dataSize) {
    case 1:
      {
        return `return vec4<f32>(${value}, 0.0, 0.0, 1.0);`;
      }
      break;
    case 2:
      {
        return `return vec4<f32>(${value}, 0.0, 1.0);`;
      }
      break;
    case 3:
      {
        return `return vec4<f32>(${value}, 1.0);`;
      }
      break;
    case 4:
      {
        return `return ${value};`;
      }
      break;
  }
};

const createDebugStepArea = (
  stepRange: StepRange,
  dataSize: 1 | 2 | 3 | 4,
  value: string
) => {
  return `
  if (uniforms.debugStep ${
    stepRange.start === stepRange.end
      ? `== ${stepRange.start}`
      : `>= ${stepRange.start} && uniforms.debugStep<= ${stepRange.end}`
  }) {\n\t${createDebugStepReturnStatement(dataSize, value)}\n}\n
  `;
};

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
  var uv = input.v_uv * (1.0 + (dot(input.v_uv,input.v_uv) - 1.0) * uniforms.screenCurvature);
  var pixel = (uv * 0.5 + 0.5)  * vec2<f32>(
    uniforms.canvasWidth, 
    uniforms.canvasHeight
  );

  var coord = pixel / uniforms.cellSize;

  var subcoord = coord * vec2<f32>(3, 1);

  var cell_offset = vec2<f32>(0, fract(floor(coord.x) * uniforms.cellOffset));

  var mask_coord = floor(coord + cell_offset) * uniforms.cellSize;

  var samplePoint = mask_coord / vec2<f32>(uniforms.canvasWidth, uniforms.canvasHeight);

  var abberation = textureSample(
    diffuse,
    image_sampler,
    samplePoint
  ).xyz;

  var color = abberation;

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
    ${createDebugStepArea({ start: 7, end: 7 }, 2, 'pixel')}
    ${createDebugStepArea({ start: 8, end: 8 }, 2, 'vec2<f32>(fract(coord.x), fract(subcoord.y))')}
    ${createDebugStepArea({ start: 9, end: 9 }, 2, 'vec2<f32>(fract(subcoord.x), fract(subcoord.y))')}
    return vec4<f32>(color, 1.0);
  `
      : `
      if (pixel.x < 1 || pixel.y < 1) {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
      }
      return vec4<f32>(color, 1.0);`
  }
}
`;
};
