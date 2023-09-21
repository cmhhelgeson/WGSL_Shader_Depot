import {
  BindGroupDescriptor,
  createBindGroupDescriptor,
} from '../../../utils/bindGroup';
import { Base2DRendererClass } from '../../../utils/program/renderProgram';
import { ShaderKeyInterface } from '../../../utils/shaderUtils';
import { BitonicDisplayShader, argKeys } from './renderShader';

type BitonicDisplayRenderArgs = ShaderKeyInterface<typeof argKeys>;

export default class BitonicDisplayRenderer extends Base2DRendererClass {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  switchBindGroup: (name: string) => void;
  setArguments: (args: BitonicDisplayRenderArgs) => void;
  computeBGDescript: BindGroupDescriptor;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    computeBGDescript: BindGroupDescriptor,
    label: string
  ) {
    super();
    this.renderPassDescriptor = renderPassDescriptor;
    this.computeBGDescript = computeBGDescript;

    const uniformBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * argKeys.length,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgDescript = createBindGroupDescriptor(
      [0],
      [GPUShaderStage.FRAGMENT],
      ['buffer'],
      [{ type: 'uniform' }],
      [[{ buffer: uniformBuffer }]],
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
      [bgDescript.bindGroupLayout, this.computeBGDescript.bindGroupLayout],
      'WEBGL',
      BitonicDisplayShader(),
      presentationFormat
    );

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.setArguments = (args: BitonicDisplayRenderArgs) => {
      const f32Args = new Float32Array([args.width, args.height]);
      const u32Args = new Uint32Array([
        args.hoveredElement,
        args.swappedElement,
      ]);
      device.queue.writeBuffer(
        uniformBuffer,
        0,
        f32Args.buffer,
        f32Args.byteOffset,
        f32Args.byteLength
      );
      device.queue.writeBuffer(
        uniformBuffer,
        8,
        u32Args.buffer,
        u32Args.byteOffset,
        u32Args.byteLength
      );
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: BitonicDisplayRenderArgs) {
    this.setArguments(args);
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.currentBindGroup,
      this.computeBGDescript.bindGroups[0],
    ]);
  }
}
