import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { Base2DRendererClass } from '../../utils/renderProgram';
import { ComplexCRTShader, argKeys } from './shader';
import { ShaderKeyInterface } from '../../utils/shaderUtils';

type ComplexCRTRendererArgs = ShaderKeyInterface<typeof argKeys> & {
  textureName: string;
};

export default class ComplexCRTRenderer extends Base2DRendererClass {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  switchBindGroup: (name: string) => void;
  setArguments: (args: Exclude<ComplexCRTRendererArgs, 'textureName'>) => void;

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

    const uniformBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * argKeys.length,
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

    this.pipeline = super.create2DRenderPipeline(
      device,
      label,
      [bgDescript.bindGroupLayout],
      'WEBGPU',
      ComplexCRTShader(debug),
      presentationFormat
    );

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.setArguments = (args: ComplexCRTRendererArgs) => {
      super.setUniformArguments(device, uniformBuffer, args, argKeys);
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: ComplexCRTRendererArgs) {
    this.setArguments(args);
    if (args.textureName !== this.currentBindGroupName) {
      this.switchBindGroup(args.textureName);
    }
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.currentBindGroup,
    ]);
  }
}
