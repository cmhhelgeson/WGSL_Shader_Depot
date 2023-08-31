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

export const ComplexCRTShader = (debug: boolean) => {
  return `
${createWGSLUniform('Uniforms', argKeys)}
${debug ? '' : ''}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) uv: vec2<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var image_sampler: sampler;
@group(0) @binding(2) var diffuse: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var uv = input.uv * (1.0 + (dot(input.uv,input.uv) - 1.0) * uniforms.screenCurvature);
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

  if (pixel.x < 1 || pixel.y < 1) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }

  return vec4<f32>(color, 1.0);

  //return vec4<f32>(pixel, 0.0, 1.0);
}
`;
};
