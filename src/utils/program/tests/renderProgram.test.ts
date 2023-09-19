import { convertVertexFormatToBytes, createVBuffers } from '../renderProgram';

const formats: GPUVertexFormat[] = [
  'float32',
  'float32x2',
  'float32x3',
  'float32x4',
];

describe('renderProgram', () => {
  it('returns proper bytes from vertexFormatToBytes', () => {
    expect(convertVertexFormatToBytes('float16x2')).toBe(4);
    expect(convertVertexFormatToBytes('float16x4')).toBe(8);
    expect(convertVertexFormatToBytes('float32')).toBe(4);
    expect(convertVertexFormatToBytes('float32x2')).toBe(8);
    expect(convertVertexFormatToBytes('float32x3')).toBe(12);
    expect(convertVertexFormatToBytes('float32x4')).toBe(16);
    expect(convertVertexFormatToBytes('uint32')).toBe(4);
    expect(convertVertexFormatToBytes('uint32x2')).toBe(8);
    expect(convertVertexFormatToBytes('uint32x3')).toBe(12);
    expect(convertVertexFormatToBytes('uint32x4')).toBe(16);
  });

  it('construct vertex buffer with proper array stride', () => {
    const buffers = createVBuffers(formats);

    expect(buffers[0].arrayStride).toBe(40);
  });

  it('construct vertex buffer with proper shader locations', () => {
    const buffers = createVBuffers(formats);
    console.log(buffers[0].attributes);
    expect(buffers[0].attributes[0].shaderLocation).toBe(0);
    expect(buffers[0].attributes[1].shaderLocation).toBe(1);
    expect(buffers[0].attributes[2].shaderLocation).toBe(2);
    expect(buffers[0].attributes[3].shaderLocation).toBe(3);
  });

  it('construct vertex buffer with proper shader locations', () => {
    const buffers = createVBuffers(formats);
    expect(buffers[0].attributes[0].offset).toBe(0);
    expect(buffers[0].attributes[1].offset).toBe(4);
    expect(buffers[0].attributes[2].offset).toBe(12);
    expect(buffers[0].attributes[3].offset).toBe(24);
  });
});
