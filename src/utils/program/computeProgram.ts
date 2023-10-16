export interface BaseComputeProgramTypes {
  readonly pipeline: GPUComputePipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
}

export const createBaseComputePipeline = (
  device: GPUDevice,
  label: string,
  layouts: GPUBindGroupLayout[],
  _code: string
) => {
  return device.createComputePipeline({
    label: `${label}.pipeline`,
    layout: device.createPipelineLayout({
      label: `${label}.layout`,
      bindGroupLayouts: layouts,
    }),
    compute: {
      module: device.createShaderModule({
        label: `${label}.shaderModule`,
        code: _code,
      }),
      entryPoint: 'computeMain',
    },
  });
};
