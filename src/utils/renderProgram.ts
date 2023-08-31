import fullscreenWebGLVertShader from '../shaders/fullscreenWebGL.vert.wgsl';
import fullScreenWebGPUVertShader from '../shaders/fullscreenWebGPU.vert.wgsl';
import fullScreenNDCVertShader from '../shaders/fullscreenNDC.vert.wgsl';
import fullscreenNDCFlippedVertShader from '../shaders/fullscreenNDCFlipped.vert.wgsl';

export interface BaseRenderer {
  readonly renderPassDescriptor: GPURenderPassDescriptor;
  readonly pipeline: GPURenderPipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
}

export type RenderPipelineDescriptor = {
  pipelines: GPURenderPipeline[];
  renderDescriptors: GPURenderPassDescriptor[];
};

type FullScreenVertexShaderType = 'WEBGPU' | 'WEBGL' | 'NDC' | 'NDCFlipped';

export const create2DRenderPipelineDescriptor = (
  vertexShaderType: FullScreenVertexShaderType,
  fragmentShader: string,
  bindGroupLayouts: GPUBindGroupLayout[],
  targetGroups: GPUTexture[][],
  label: string,
  device: GPUDevice
): RenderPipelineDescriptor => {
  const perPipelineTargetGroups = targetGroups.map((targets) => {
    const targetGroups: GPUColorTargetState[] = targets.map((target) => {
      console.log(target);
      if (target === null) {
        return { format: navigator.gpu.getPreferredCanvasFormat() };
      }
      return { format: target.format };
    });
    return targetGroups;
  });

  const pipelines = perPipelineTargetGroups.map((targets, idx) => {
    return device.createRenderPipeline({
      label: `${label}.pipeline${idx}`,
      layout: device.createPipelineLayout({
        label: `${label}.pipelineLayout${idx}`,
        bindGroupLayouts: bindGroupLayouts,
      }),
      vertex: create2DVertexModule(device, 'WEBGL'),
      fragment: {
        module: device.createShaderModule({
          code: fragmentShader,
        }),
        entryPoint: 'fragmentMain',
        targets: targets,
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
    });
  });

  const renderDescriptors = targetGroups.map((targets, idx) => {
    const descriptors = targets.map((target) => {
      const colorAttachment: GPURenderPassColorAttachment = {
        view: undefined,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      };
      if (target !== null) {
        colorAttachment.view = target.createView();
      }
      return colorAttachment;
    });
    const renderDescriptor: GPURenderPassDescriptor = {
      label: `${label}.colorDescriptor${idx}`,
      colorAttachments: descriptors,
    };
    return renderDescriptor;
  });

  return {
    pipelines,
    renderDescriptors,
  };
};

export const create2DVertexModule = (
  device: GPUDevice,
  uvOrder: FullScreenVertexShaderType
): GPUVertexState => {
  let vertexCode = fullScreenWebGPUVertShader;
  switch (uvOrder) {
    case 'WEBGPU':
      {
        vertexCode = fullScreenWebGPUVertShader;
      }
      break;
    case 'WEBGL':
      {
        vertexCode = fullscreenWebGLVertShader;
      }
      break;
    case 'NDC':
      {
        vertexCode = fullScreenNDCVertShader;
      }
      break;
    case 'NDCFlipped':
      {
        vertexCode = fullscreenNDCFlippedVertShader;
      }
      break;
  }
  const vertexState = {
    module: device.createShaderModule({
      code: vertexCode,
    }),
    entryPoint: 'vertexMain',
  };
  return vertexState;
};

export abstract class Base2DRendererClass {
  abstract switchBindGroup(name: string): void;
  abstract startRun(commandEncoder: GPUCommandEncoder, ...args: any[]): void;
  renderPassDescriptor: GPURenderPassDescriptor; // | GPURENDERPASSDESCRIPTOR[]
  pipeline: GPURenderPipeline; // GPURenderPipelien[]
  bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;

  executeRun(
    commandEncoder: GPUCommandEncoder,
    renderPassDescriptor: GPURenderPassDescriptor,
    pipeline: GPURenderPipeline,
    bindGroups: GPUBindGroup[]
  ) {
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    for (let i = 0; i < bindGroups.length; i++) {
      passEncoder.setBindGroup(i, bindGroups[i]);
    }
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.end();
  }

  setUniformArguments<T, K extends readonly string[]>(
    device: GPUDevice,
    uniformBuffer: GPUBuffer,
    instance: T,
    keys: K
  ) {
    for (let i = 0; i < keys.length; i++) {
      device.queue.writeBuffer(
        uniformBuffer,
        i * 4,
        new Float32Array([instance[keys[i]]])
      );
    }
  }

  create2DRenderPipeline(
    device: GPUDevice,
    label: string,
    bgLayouts: GPUBindGroupLayout[],
    mode: FullScreenVertexShaderType,
    code: string,
    presentationFormat: GPUTextureFormat
  ) {
    return device.createRenderPipeline({
      label: `${label}.pipeline`,
      layout: device.createPipelineLayout({
        bindGroupLayouts: bgLayouts,
      }),
      vertex: create2DVertexModule(device, mode),
      fragment: {
        module: device.createShaderModule({
          code: code,
        }),
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: presentationFormat,
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
    });
  }
}
