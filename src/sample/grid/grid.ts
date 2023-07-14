import fullscreenVertWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { BaseRenderer } from '../../utils/renderProgram';
import gridFragWGSL from './grid.frag.wgsl';
import gridDebugFragWGSL from './gridDebug.frag.wgsl';

type GridRendererArgumentsType = {
  gridDimensions: number;
  cellOriginX: number;
  cellOriginY: number;
  lineWidth: number;
  debugStep: number;
};

export default class GridRenderer implements BaseRenderer {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  readonly renderPassDescriptor: GPURenderPassDescriptor;
  readonly pipeline: GPURenderPipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
  private dimensions: number;
  private originX: number;
  private originY: number;
  private lineWidth: number;
  private readonly changeDimensions: (dimensions: number) => void;
  private readonly changeCellOriginX: (offset: number) => void;
  private readonly changeCellOriginY: (offset: number) => void;
  private readonly changeLineWidth: (offset: number) => void;
  private changeDebugStep: (step: number) => void;d

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    label: string,
    debug = false
  ) {
    this.renderPassDescriptor = renderPassDescriptor;

    let bufferElements = 4;
    if (debug) {
      bufferElements += 1;
    }

    const uniformBufferSize = Float32Array.BYTES_PER_ELEMENT * bufferElements;
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgDescript = createBindGroupDescriptor(
      [0],
      [GPUShaderStage.FRAGMENT],
      ['buffer'],
      [{ type: 'uniform' }],
      [[{ buffer: uniformBuffer }]],
      'Grid',
      device
    );

    this.currentBindGroup = bgDescript.bindGroups[0];
    this.currentBindGroupName = bindGroupNames[0];

    this.bindGroupMap = {};
    bgDescript.bindGroups.forEach((bg, idx) => {
      this.bindGroupMap[bindGroupNames[idx]] = bg;
    });

    this.pipeline = device.createRenderPipeline({
      label: 'GridRenderer.pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bgDescript.bindGroupLayout],
      }),
      vertex: {
        module: device.createShaderModule({
          code: fullscreenVertWGSL,
        }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: device.createShaderModule({
          code: debug ? gridDebugFragWGSL : gridFragWGSL,
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
      if (this.dimensions !== dimensions) {
        device.queue.writeBuffer(
          uniformBuffer,
          0,
          new Float32Array([dimensions])
        );
        this.dimensions = dimensions;
      }
    };

    this.changeCellOriginX = (offset: number) => {
      if (this.originX !== offset) {
        device.queue.writeBuffer(uniformBuffer, 4, new Float32Array([offset]));
        this.originX = offset;
      }
    };

    this.changeCellOriginY = (offset: number) => {
      if (this.originY !== offset) {
        device.queue.writeBuffer(uniformBuffer, 8, new Float32Array([offset]));
        this.originY = offset;
      }
    };

    this.changeLineWidth = (newWidth: number) => {
      if (this.lineWidth !== newWidth) {
        device.queue.writeBuffer(
          uniformBuffer,
          12,
          new Float32Array([newWidth])
        );
        this.lineWidth = newWidth;
      }
    };

    this.changeDebugStep = (step: number) => {
      if (debug) {
        device.queue.writeBuffer(uniformBuffer, 16, new Float32Array([step]));
      }
    };
  }

  run(commandEncoder: GPUCommandEncoder, args: GridRendererArgumentsType) {
    this.changeDimensions(args.gridDimensions);
    this.changeCellOriginX(args.cellOriginX);
    this.changeCellOriginY(args.cellOriginY);
    this.changeLineWidth(args.lineWidth);
    this.changeDebugStep(args.debugStep);
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.currentBindGroup);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.end();
  }
}
