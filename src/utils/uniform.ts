import { GUI } from 'dat.gui';
type GuiParams = {
  gui: GUI;
  settings: any;
  min: number;
  max: number;
  step: number;
  onChange: (value: any) => void;
  displayName: string;
};

interface UniformDescriptor {
  name: string;
  size: number;
  buffer: GPUBuffer;
}

export const createUniformDescriptor = (
  name: string,
  size: number,
  values: number[],
  device: GPUDevice,
  guiParams?: GuiParams
): UniformDescriptor => {
  if (size != values.length) {
  }

  const buffer = device.createBuffer({
    mappedAtCreation: true,
    size: size * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const mappedBuffer = buffer.getMappedRange();
  new Float32Array(mappedBuffer).set(new Float32Array(values));
  buffer.unmap();

  if (guiParams !== null && size === 1) {
    guiParams.gui
      .add(
        guiParams.settings,
        name,
        guiParams.min,
        guiParams.max,
        guiParams.step
      )
      .onChange((v) => {
        guiParams.onChange(v);
      });
  }

  return {
    name,
    size,
    buffer,
  };
};
