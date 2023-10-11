import fullscreenWebGLVertShader from '../../shaders/fullscreenWebGL.vert.wgsl';
import fullScreenWebGPUVertShader from '../../shaders/fullscreenWebGPU.vert.wgsl';
import fullScreenNDCVertShader from '../../shaders/fullscreenNDC.vert.wgsl';
import fullscreenNDCFlippedVertShader from '../../shaders/fullscreenNDCFlipped.vert.wgsl';
import { Renderable } from '../../meshes/mesh';

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

export type FullScreenVertexShaderType =
  | 'WEBGPU'
  | 'WEBGL'
  | 'NDC'
  | 'NDCFlipped';

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
    presentationFormat: GPUTextureFormat,
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

export const convertVertexFormatToBytes = (vf: GPUVertexFormat): number => {
  const splitFormat = vf.split('x');
  const bytesPerElement = parseInt(splitFormat[0].replace(/[^0-9]/g, '')) / 8;

  const bytesPerVec =
    bytesPerElement *
    (splitFormat[1] !== undefined ? parseInt(splitFormat[1]) : 1);

  return bytesPerVec;
};

interface AttribAcc {
  attributes: GPUVertexAttribute[];
  arrayStride: number;
}

export const createVBuffers = (
  vertexFormats: GPUVertexFormat[]
): GPUVertexBufferLayout[] => {
  const initialValue: AttribAcc = { attributes: [], arrayStride: 0 };

  const vertexBuffer = vertexFormats.reduce(
    (acc: AttribAcc, curr: GPUVertexFormat, idx: number) => {
      const newAttribute: GPUVertexAttribute = {
        shaderLocation: idx,
        offset: acc.arrayStride,
        format: curr,
      };
      const nextOffset: number =
        acc.arrayStride + convertVertexFormatToBytes(curr);

      const retVal: AttribAcc = {
        attributes: [...acc.attributes, newAttribute],
        arrayStride: nextOffset,
      };
      return retVal;
    },
    initialValue
  );
  return [
    {
      arrayStride: vertexBuffer.arrayStride,
      attributes: vertexBuffer.attributes,
    },
  ];
};

export const create3DRenderPipeline = (
  device: GPUDevice,
  label: string,
  bgLayouts: GPUBindGroupLayout[],
  vertexShader: string,
  vBufferFormats: GPUVertexFormat[],
  fragmentShader: string,
  presentationFormat: GPUTextureFormat,
  depthTest = false,
  topology?: GPUPrimitiveTopology,
  indexFormat = 'uint16'
) => {
  const pipelineDescriptor: GPURenderPipelineDescriptor = {
    label: `${label}.pipeline`,
    layout: device.createPipelineLayout({
      label: `${label}.pipelineLayout`,
      bindGroupLayouts: bgLayouts,
    }),
    vertex: {
      module: device.createShaderModule({
        label: `${label}.vertexShader`,
        code: vertexShader,
      }),
      entryPoint: 'vertexMain',
      buffers: createVBuffers(vBufferFormats),
    },
    fragment: {
      module: device.createShaderModule({
        label: `${label}.fragmentShader`,
        code: fragmentShader,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: topology ? topology : 'triangle-list',
      cullMode: 'back',
    },
  };
  if (depthTest) {
    pipelineDescriptor.depthStencil = {
      depthCompare: 'less',
      depthWriteEnabled: true,
      format: 'depth24plus',
    };
  }
  return device.createRenderPipeline(pipelineDescriptor);
};

//TODO: This works well for single instance objects but not for renderables
export abstract class Base3DRendererClass {
  abstract switchBindGroup(name: string): void;
  abstract startRun(commandEncoder: GPURenderPassEncoder, ...args: any[]): void;
  renderPassDescriptor: GPURenderPassDescriptor; // | GPURENDERPASSDESCRIPTOR[]
  pipeline: GPURenderPipeline; // GPURenderPipelien[]
  bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
  //TODO: Actually put some planning behind this? Should this belong here
  //You're really just saying this to justiy your queasiness about this hasty
  //decision
  renderables: Renderable[];

  executeRun(
    passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder,
    pipeline: GPURenderPipeline,
    bindGroups: GPUBindGroup[]
  ) {
    passEncoder.setPipeline(pipeline);
    //Set bindGroups that are needed across all renderables
    let bgIdxTotal = 0;
    bindGroups.forEach((bg, idx) => {
      passEncoder.setBindGroup(idx, bg);
      bgIdxTotal += 1;
    });

    for (const renderable of this.renderables) {
      if (renderable.bindGroup) {
        passEncoder.setBindGroup(bgIdxTotal, renderable.bindGroup);
      }
      passEncoder.setVertexBuffer(0, renderable.vertexBuffer);
      passEncoder.setIndexBuffer(renderable.indexBuffer, 'uint16');
      passEncoder.drawIndexed(renderable.indexCount);
    }
  }

  setUniformArguments<T, K extends readonly string[]>(
    device: GPUDevice,
    uniformBuffer: GPUBuffer,
    uniformDataType: 'f32' | 'mat4x4f',
    instance: T,
    keys: K
  ) {
    const indexOffset =
      uniformDataType === 'f32'
        ? Float32Array.BYTES_PER_ELEMENT
        : Float32Array.BYTES_PER_ELEMENT * 4 * 4;
    for (let i = 0; i < keys.length; i++) {
      device.queue.writeBuffer(
        uniformBuffer,
        i * indexOffset,
        new Float32Array([instance[keys[i]]])
      );
    }
  }

  createRenderPipeline(
    device: GPUDevice,
    label: string,
    bgLayouts: GPUBindGroupLayout[],
    vertexShader: string,
    vBufferFormats: GPUVertexFormat[],
    fragmentShader: string,
    presentationFormat: GPUTextureFormat,
    debug = true,
    topology?: GPUPrimitiveTopology,
  ) {
    return create3DRenderPipeline(
      device,
      label,
      bgLayouts,
      vertexShader,
      vBufferFormats,
      fragmentShader,
      presentationFormat,
      debug,
      topology
    );
  }
}
