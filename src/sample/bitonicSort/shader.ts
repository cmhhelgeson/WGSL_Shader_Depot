/* eslint-disable prettier/prettier */
import { createWGSLUniform } from '../../utils/shaderUtils';

export const argKeys = [
  'width',
  'height'
];

export const BitonicDisplayShader = () => {
  return `
${createWGSLUniform('Uniforms', argKeys)}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<storage, read_write> data: array<u32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  //WEBGL shader, uvs are in range of 0 -> 1
  var uv: vec2<f32> = vec2<f32>(
    input.v_uv.x * uniforms.width,
    input.v_uv.y * uniforms.height
  )

  var pixel = vec2<u32> vec2<u32>(
    u32(floor(input.v_uv.x),
    u32(floor(input.v_uv).x),
  );
  
  var colorChanger = data[uniforms.width * pixel.y + pixel.x];

  var color: vec3<f32> = vec3f(255.0 - 255.0 / colorChanger);

  return vec4<f32>(color, 1.0);
}
`;
};