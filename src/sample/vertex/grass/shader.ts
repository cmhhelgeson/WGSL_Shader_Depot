import {
  createVertexInput,
  createWGSLUniform,
} from '../../../utils/shaderUtils';

export const fogUniformArgKeys = [
  'colorR',
  'colorG',
  'colorB',
  'linearStart',
  'linearEnd',
  'density',
  'equation',
];

export const matUniformArgKeys = ['projMat', 'viewMat', 'modelMat'];

export const TerrainVertexShader = (
  vertexFormts: GPUVertexFormat[]
): string => {
  const VertexInput = createVertexInput({
    names: ['position', 'center'],
    formats: vertexFormts,
  });

  return `
${VertexInput}
${createWGSLUniform('FogUniforms', fogUniformArgKeys)}
${createWGSLUniform('MatUniforms', matUniformArgKeys)}

@group(0) @binding(0) var<uniform> fogUniforms: FogUniforms;
@group(0) @binding(1) var<uniform> matUniforms: MatUniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  var MVP = matUniforms.projMat * matUniforms.viewMat * matUniforms.modelMat;
  output.position = MVP * input.position;
  output.center = input.center;
}

@fragment()
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {

}
`;
};
