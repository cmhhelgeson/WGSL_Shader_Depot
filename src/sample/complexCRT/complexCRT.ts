import { createBindGroupDescriptor } from '../../utils/bindGroup';
import crtFragWGSL from './complexCRT.frag.wgsl';
import { Base2DRendererClass, BaseRenderer } from '../../utils/renderProgram';

//TODO: lo hizo

interface ComplexCRTRendererArgs {
  debugStep: number;
  canvasWidth: number;
  canvasHeight: number;
  time: number;
  textureName: string;
  cellOffset: number;
  cellSize: number;
  borderMask: number;
}

const excludeProperties = <T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> => {
  const result = { ...obj };

  keys.forEach((key) => {
    delete result[key];
  });

  return result as Omit<T, K>;
};

export default class ComplexCRTRenderer
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
  switchBindGroup: (name: string) => void;
  changeDebugStep: (step: number) => void;
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
    const uniformElements = 7;

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

    super.create2DRenderPipeline(
      device,
      label,
      [bgDescript.bindGroupLayout],
      'WEBGPU',
      crtFragWGSL,
      presentationFormat
    );

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.setArguments = (args: ComplexCRTRendererArgs) => {
      const newArgs = excludeProperties(args, 'textureName');
      device.queue.writeBuffer(
        uniformBuffer,
        0,
        new Float32Array[newArgs.debugStep]()
      );
      device.queue.writeBuffer(
        uniformBuffer,
        4,
        new Float32Array[newArgs.canvasWidth]()
      );
      device.queue.writeBuffer(
        uniformBuffer,
        8,
        new Float32Array[newArgs.canvasHeight]()
      );
      device.queue.writeBuffer(
        uniformBuffer,
        12,
        new Float32Array[newArgs.time]()
      );
      device.queue.writeBuffer(
        uniformBuffer,
        16,
        new Float32Array[newArgs.cellOffset]()
      );
      device.queue.writeBuffer(
        uniformBuffer,
        20,
        new Float32Array[newArgs.cellSize]()
      );
      device.queue.writeBuffer(
        uniformBuffer,
        24,
        new Float32Array[newArgs.borderMask]()
      );
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
