import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { Base2DRendererClass } from '../../utils/renderProgram';
import { SDFCircleShader, argKeys } from './shader';
import { ShaderKeyInterface } from '../../utils/shaderUtils';

type SDFCircleRendererArgs = ShaderKeyInterface<typeof argKeys>;

export default class SDFCircleRenderer extends Base2DRendererClass {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  switchBindGroup: (name: string) => void;
  setArguments: (args: SDFCircleRendererArgs) => void;

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
      [bgDescript.bindGroupLayout],
      'NDCFlipped',
      SDFCircleShader(debug),
      presentationFormat
    );

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.setArguments = (args: SDFCircleRendererArgs) => {
      super.setUniformArguments(device, uniformBuffer, args, argKeys);
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: SDFCircleRendererArgs) {
    this.setArguments(args);
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.currentBindGroup,
    ]);
  }
}
