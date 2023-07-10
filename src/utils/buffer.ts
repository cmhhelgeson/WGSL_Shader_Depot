import { ArrayLike } from 'wgpu-matrix/dist/1.x/array-like';

export const writeToF32Buffer = (
  arrayLikes: ArrayLike[],
  numberLikes: Float32Array,
  buffer: GPUBuffer,
  device: GPUDevice
) => {
  let ele = arrayLikes[0] as Float32Array;
  device.queue.writeBuffer(
    buffer,
    0,
    ele.buffer,
    ele.byteOffset,
    ele.byteLength
  );
  let writtenBufferSize =
    (arrayLikes[0].length === 3 ? 4 : arrayLikes[0].length) *
    Float32Array.BYTES_PER_ELEMENT;

  for (let i = 1; i < arrayLikes.length; i++) {
    ele = arrayLikes[i] as Float32Array;
    device.queue.writeBuffer(
      buffer,
      writtenBufferSize,
      ele.buffer,
      ele.byteOffset,
      ele.byteLength
    );
    writtenBufferSize +=
      (arrayLikes[i].length === 3 ? 4 : arrayLikes[i].length) *
      Float32Array.BYTES_PER_ELEMENT;
  }

  device.queue.writeBuffer(
    buffer,
    writtenBufferSize,
    numberLikes.buffer,
    numberLikes.byteOffset,
    numberLikes.byteLength
  );
};
