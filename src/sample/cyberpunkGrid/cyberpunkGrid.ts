import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { BaseRenderer } from '../../utils/renderProgram';
import { Base2DRendererClass } from '../../utils/renderProgram';
import CyberpunkCommonsWGSL from './cyberpunk_commons.wgsl';
import { CyberpunkGridShader } from './shader';
import { argKeys } from './shader';

type DynamicInterface<T extends string[]> = {
  [K in T[number]]: number;
};

type CyberpunkGridRenderArgs = DynamicInterface<typeof argKeys>;

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
  prevArguments: CyberpunkGridRenderArgs;
  switchBindGroup: (name: string) => void;
  prevDebugStep: number;
  changeArgs: (args: CyberpunkGridRenderArgs) => void;

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
    const uniformElements = 13;
    console.log(`Uniform Elements: ${uniformElements}`);

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

    this.pipeline = super.create2DRenderPipeline(
      device,
      label,
      [bgDescript.bindGroupLayout],
      'WEBGL',
      CyberpunkGridShader(debug) + CyberpunkCommonsWGSL,
      presentationFormat
    );

    this.changeArgs = (args: CyberpunkGridRenderArgs) => {
      super.setUniformArguments(device, uniformBuffer, args, argKeys);
    };

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: CyberpunkGridRenderArgs) {
    this.changeArgs(args);
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.currentBindGroup,
    ]);
  }
}
