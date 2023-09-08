import { createFragmentShaderResources } from '../../utils/shaderUtils';

export const argKeys = ['radius', 'xOffset', 'yOffset', 'debugStep'];

export const SDFCircleShader = (debug: boolean) => {
  return `
fn sdCircle(p: vec2<f32>, r: f32) -> f32 {
  return length(p)-r;
}

${createFragmentShaderResources(argKeys)}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var d: f32 = sdfCircle(
    vec2<f32>(input.v_uv.x - xOffset, input.v_uv.y - yOffset), r
  );

  var color: vec3<f32> = select(
    //If d < 0.0 (within bounds, choose blue)
    vec3<f32>(0.65, 0.85, 1.0),
    //Else orange
    vec3<f32>(0.9, 0.6, 0.3),
    d > 0.0
  );

  return color;
}
`;
};
