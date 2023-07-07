import fullscreenVertWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';
import gridFragWGSL from './grid.frag.wgsl';

type GridRendererArgumentsType = {
  gridDimensions: number;
  cellOriginX: number;
  cellOriginY: number;
};

export default class GridRenderer {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  private readonly renderPassDescriptor: GPURenderPassDescriptor;
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroup: GPUBindGroup;
  private readonly changeDimensions: (dimensions: number) => void;
  private readonly changeCellOriginX: (offset: number) => void;
  private readonly changeCellOriginY: (offset: number) => void;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor
  ) {
    this.renderPassDescriptor = renderPassDescriptor;

    const bindGroupLayout = device.createBindGroupLayout({
      label: 'GridRenderer.bindGroupLayout',
      entries: [
        {
          // grid dimensions + grid offset
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform',
          },
        },
      ],
    });

    const uniformBufferSize = Float32Array.BYTES_PER_ELEMENT * 3;
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = device.createBindGroup({
      label: 'GridRenderer.bindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          // lightmap
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
      ],
    });

    this.pipeline = device.createRenderPipeline({
      label: 'GridRenderer.pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: device.createShaderModule({
          code: fullscreenVertWGSL,
        }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: device.createShaderModule({
          code: gridFragWGSL,
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

    this.changeDimensions = (dimensions: number) => {
      device.queue.writeBuffer(
        uniformBuffer,
        0,
        new Float32Array([dimensions])
      );
    };

    this.changeCellOriginX = (offset: number) => {
      device.queue.writeBuffer(uniformBuffer, 4, new Float32Array([offset]));
    };

    this.changeCellOriginY = (offset: number) => {
      device.queue.writeBuffer(uniformBuffer, 8, new Float32Array([offset]));
    };
  }

  run(commandEncoder: GPUCommandEncoder, args: GridRendererArgumentsType) {
    this.changeDimensions(args.gridDimensions);
    this.changeCellOriginX(args.cellOriginX);
    this.changeCellOriginY(args.cellOriginY);
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(8, 1, 0, 0);
    passEncoder.end();
  }
}
