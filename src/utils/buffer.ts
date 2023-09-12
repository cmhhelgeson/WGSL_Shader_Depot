/**
 * @param {GPUDevice} device - The GPU performing each buffer write.
 * @param {GPUBuffer} buffer-  The buffer we are filling with data.
 * @param {Float32Array[]} mat4Arr - An array of multiple 4x4 matrices.
 * @returns {string} An offset designating the end of the region that was written to within the buffer.
 */
export const writeMat4ToBuffer = (
  device: GPUDevice,
  buffer: GPUBuffer,
  mat4Arr: Float32Array[],
  offset = 0
): number => {
  for (let i = 0; i < mat4Arr.length; i++) {
    device.queue.writeBuffer(
      buffer,
      offset + 64 * i,
      mat4Arr[i].buffer,
      mat4Arr[i].byteOffset,
      mat4Arr[i].byteLength
    );
  }
  return 64 * mat4Arr.length;
};

/**
 * @param {GPUDevice} device - The GPU performing each buffer write.
 * @param {GPUBuffer} buffer-  The buffer we are filling with data.
 * @param {Float32Array[]} mat4Arr - An array of f32 values.
 * @returns {string} An offset designating the end of the region that was written to within the buffer.
 */
export const write32ToBuffer = (
  device: GPUDevice,
  buffer: GPUBuffer,
  arr: (Float32Array | Uint32Array)[],
  offset = 0
) => {
  for (let i = 0; i < arr.length; i++) {
    device.queue.writeBuffer(
      buffer,
      offset + 4 * i,
      arr[i].buffer,
      arr[i].byteOffset,
      arr[i].byteLength
    );
  }
  return 4 * arr.length;
};

/**
 * @param {GPUDevice} device - The GPU performing each buffer write.
 * @param {GPUBuffer} buffer-  The buffer we are filling with data.
 * @param {Float32Array[]} arr - An array of vec2<f32> values.
 * @returns {string} An offset designating the end of the region that was written to within the buffer.
 */
export const write32x2ToBuffer = (
  device: GPUDevice,
  buffer: GPUBuffer,
  arr: (Float32Array | Uint32Array)[],
  offset = 0
) => {
  for (let i = 0; i < arr.length; i++) {
    device.queue.writeBuffer(
      buffer,
      offset + 8 * i,
      arr[i].buffer,
      arr[i].byteOffset,
      arr[i].byteLength
    );
  }
  return 4 * arr.length;
};
