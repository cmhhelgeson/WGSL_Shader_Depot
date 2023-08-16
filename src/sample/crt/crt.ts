import { createBindGroupDescriptor } from '../../utils/bindGroup';
import crtFragWGSL from './crt.frag.wgsl';
import crtDebugFragWGSL from './crtDebug.frag.wgsl';
import {
  Base2DRendererClass,
  BaseRenderer,
  create2DVertexModule,
} from '../../utils/renderProgram';

interface CRTRendererArgs {
  time: number;
  textureName: string;
  debugStep: number;
}

export default class CRTRenderer
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
  changeDebugStep: (step: number) => void;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    textures: GPUTexture[],
    label: string,
    debug = false
  ) {
    super();
    this.renderPassDescriptor = renderPassDescriptor;
    const uniformElements = 2;

    const uniformBufferSize = Float32Array.BYTES_PER_ELEMENT * uniformElements;
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const sampler = device.createSampler({
      minFilter: 'linear',
      magFilter: 'linear',
    });

    const resourceArr = textures.map((texture) => {
      return [{ buffer: uniformBuffer }, sampler, texture.createView()];
    });
    console.log(resourceArr);

    const bgDescript = createBindGroupDescriptor(
      [0, 1, 2],
      [GPUShaderStage.FRAGMENT],
      ['buffer', 'sampler', 'texture'],
      [{ type: 'uniform' }, { type: 'filtering' }, { sampleType: 'float' }],
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

    console.log(this.bindGroupMap);

    this.pipeline = device.createRenderPipeline({
      label: `${label}.pipeline`,
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bgDescript.bindGroupLayout],
      }),
      vertex: create2DVertexModule(device, 'WEBGPU'),
      fragment: {
        module: device.createShaderModule({
          code: debug ? crtDebugFragWGSL : crtFragWGSL,
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

    this.setTime = (time: number) => {
      device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time]));
    };

    this.changeDebugStep = (step: number) => {
      const offset = (uniformElements - 1) * Float32Array.BYTES_PER_ELEMENT;
      device.queue.writeBuffer(uniformBuffer, offset, new Float32Array([step]));
    };

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: CRTRendererArgs) {
    this.setTime(args.time);
    this.changeDebugStep(args.debugStep);
    if (args.textureName !== this.currentBindGroupName) {
      this.switchBindGroup(args.textureName);
    }
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.currentBindGroup,
    ]);
  }
}
