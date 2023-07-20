import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { BaseRenderer, create2DVertexModule } from '../../utils/renderProgram';
import { Base2DRendererClass } from '../../utils/renderProgram';
import SDFFragWGSL from './sdf.frag.wgsl';
import SDFFragDebugWGSL from './sdfDebug.frag.wgsl';

type SDFRendererArgs = {
  time: number;
  debugStep: number;
};

export default class CyberpunkGridRenderer
  extends Base2DRendererClass
  implements BaseRenderer
{
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  readonly renderPassDescriptor: GPURenderPassDescriptor;
  readonly pipeline: GPURenderPipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
  private readonly setTime: (time: number) => void;
  switchBindGroup: (name: string) => void;
  prevDebugStep: number;
  changeCanvasWidth: (width: number) => void;
  changeCanvasHeight: (height: number) => void;
  changeTime: (time: number) => void;
  changeDebugStep: (step: number) => void;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    label: string,
    debug = false
  ) {
    super();
    this.renderPassDescriptor = renderPassDescriptor;
    const uniformElements = 1;

    const uniformBufferSize = Float32Array.BYTES_PER_ELEMENT * uniformElements;
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const resourceArr = [[{ buffer: uniformBuffer }]];

    const bgDescript = createBindGroupDescriptor(
      [0],
      [GPUShaderStage.FRAGMENT],
      ['buffer'],
      [{ type: 'uniform' }],
      resourceArr,
      label,
      device
    );

    this.currentBindGroup = bgDescript.bindGroups[0];
    this.currentBindGroupName = bindGroupNames[0];

    this.bindGroupMap = {};

    bgDescript.bindGroups.forEach((bg, idx) => {
      this.bindGroupMap[bindGroupNames[idx]] = bg;
    });

    this.pipeline = device.createRenderPipeline({
      label: `${label}.pipeline`,
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bgDescript.bindGroupLayout],
      }),
      vertex: create2DVertexModule(device, 'WEBGL'),
      fragment: {
        module: device.createShaderModule({
          code: debug ? SDFFragDebugWGSL : SDFFragWGSL,
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

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.changeCanvasWidth = (width: number) => {
      device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([width]));
    };

    this.changeCanvasHeight = (height: number) => {
      device.queue.writeBuffer(uniformBuffer, 4, new Float32Array([height]));
    };

    this.changeTime = (time: number) => {
      device.queue.writeBuffer(uniformBuffer, 8, new Float32Array([time]));
    };

    this.changeDebugStep = (step: number) => {
      device.queue.writeBuffer(uniformBuffer, 12, new Float32Array([step]));
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: SDFRendererArgs) {
    this.changeCanvasWidth(args.canvasWidth);
    this.changeCanvasHeight(args.canvasHeight);
    this.changeTime(args.time);
    if (args.debugStep !== this.prevDebugStep) {
      this.changeDebugStep(args.debugStep);
      this.prevDebugStep = args.debugStep;
    }
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.currentBindGroup,
    ]);
  }
}
