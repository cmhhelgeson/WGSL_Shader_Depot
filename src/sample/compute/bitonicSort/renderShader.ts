/* eslint-disable prettier/prettier */

export const argKeys = [
  //screen width in cells/elements
  'width',
  //screen height in cells/elements
  'height',
  //Hovered element
  'hoveredElement',
  //element it just swapped with
  'swappedElement'
];

export const BitonicDisplayShader = () => {
return `
struct Uniforms {
  width: f32,
  height: f32,
  hoveredElement: u32,
  swappedElement: u32,
}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<storage, read> data: array<u32>;
@group(1) @binding(3) var<storage, read> indices: array<u32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  //WEBGL shader, uvs are in range of 0 -> 1
  var uv: vec2<f32> = vec2<f32>(
    input.v_uv.x * uniforms.width,
    input.v_uv.y * uniforms.height
  );

  var pixel: vec2<u32> = vec2<u32>(
    u32(floor(uv.x)),
    u32(floor(uv.y)),
  );
  
  var elementIndex = u32(uniforms.width) * pixel.y + pixel.x;
  var colorChanger = data[elementIndex];

  var subtracter = (
    1.0 / (uniforms.width * uniforms.height)
  ) * f32(colorChanger);

  var color: vec3<f32> = vec3f(
    1.0 - subtracter
  );

  if (uniforms.hoveredElement == elementIndex) {
    return vec4<f32>(255.0, 0.0, 0.0, 1.0);
  }

  if (uniforms.swappedElement == elementIndex) {
    return vec4<f32>(0.0, 255.0, 0.0, 1.0);
  }

  return vec4<f32>(color.rgb, 1.0);
}
`;
};