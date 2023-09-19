export interface BaseComputeProgramTypes {
  readonly pipeline: GPUComputePipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
}

export abstract class BaseComputeProgramClass {
  abstract changeDebugStep(step: number): void;
  abstract switchBindGroup(name: string): void;
  abstract startRun(commandEncoder: GPUCommandEncoder, ...args: any[]): void;

  createPipeline(
    device: GPUDevice,
    label: string,
    layouts: GPUBindGroupLayout[],
    _code: string
  ): GPUComputePipeline {
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
  }

  executeRun(
    commandEncoder: GPUCommandEncoder,
    pipeline: GPUComputePipeline,
    bindGroups: GPUBindGroup[],
    workgroups: number
  ) {
    const computePassEncoder = commandEncoder.beginComputePass();
    computePassEncoder.setPipeline(pipeline);
    for (let i = 0; i < bindGroups.length; i++) {
      computePassEncoder.setBindGroup(i, bindGroups[i]);
    }
    computePassEncoder.dispatchWorkgroups(workgroups);
    computePassEncoder.end();
  }
}
