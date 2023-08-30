import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { BaseRenderer } from '../../utils/renderProgram';
import { Base2DRendererClass } from '../../utils/renderProgram';
import CyberpunkCommonsWGSL from './cyberpunk_commons.wgsl';
import { CyberpunkGridShader } from './shader';

type DynamicInterface<T extends readonly string[]> = {
  [K in T[number]]: number;
};

const CyberpunkGridRendererArgsKeys = [
  'gridLineR',
  'gridLineG',
  'gridLineB',
  'time',
  'canvasWidth',
  'canvasHeight',
  'debugStep',
  'fog',
  'lineSize',
  'lineGlow',
  'sunX',
  'sunY',
  'gridLineSpeed',
] as const;



for (let i = 0; i < CyberpunkGridRendererArgsKeys.length; i++) {
  console.log(CyberpunkGridRendererArgsKeys[i]);
}

type CPGRendererArgs = DynamicInterface<typeof CyberpunkGridRendererArgsKeys>;

interface CyberpunkGridRenderArgs {
  gridLineR: number;
  gridLineG: number;
  gridLineB: number;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
  debugStep: number;
  fog: number;
  lineSize: number;
  lineGlow: number;
  sunX: number;
  sunY: number;
  gridLineSpeed: number;
}

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
  private readonly setTime: (time: number) => void;
  switchBindGroup: (name: string) => void;
  prevDebugStep: number;
  changeArgs: (args: CyberpunkGridRenderArgs) => void;
  changeCanvasWidth: (width: number) => void;
  changeCanvasHeight: (height: number) => void;
  changeTime: (time: number) => void;
  changeDebugStep: (step: number) => void;
  changeGridLineColor: (r: number, g: number, b: number) => void;
  changeFog: (fog: number) => void;
  changeLineSize: (lineSize: number) => void;
  changeLineGlow: (lineGlow: number) => void;
  changeSunX: (sunX: number) => void;
  changeSunY: (sunY: number) => void;
  changeGridLineSpeed: (lineSpeed: number) => void;

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

    this.prevArguments = {
      gridLineR: 0,
      gridLineG: 0,
      gridLineB: 0,
      time: 0,
      canvasWidth: 0,
      canvasHeight: 0,
      debugStep: 0,
      fog: 0,
      lineSize: 0,
      lineGlow: 0,
      sunX: 0,
      sunY: 0,
      gridLineSpeed: 0,
    };

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.changeArgs = (args: CyberpunkGridRenderArgs) => {

    }

    this.changeGridLineColor = (r: number, g: number, b: number) => {
      device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([r, g, b]));
    };

    this.changeCanvasWidth = (width: number) => {
      device.queue.writeBuffer(uniformBuffer, 12, new Float32Array([width]));
    };

    this.changeCanvasHeight = (height: number) => {
      device.queue.writeBuffer(uniformBuffer, 16, new Float32Array([height]));
    };

    this.changeTime = (time: number) => {
      device.queue.writeBuffer(uniformBuffer, 20, new Float32Array([time]));
    };

    this.changeFog = (fog: number) => {
      device.queue.writeBuffer(uniformBuffer, 24, new Float32Array([fog]));
    };

    this.changeLineSize = (lineSize: number) => {
      device.queue.writeBuffer(uniformBuffer, 28, new Float32Array([lineSize]));
    };

    this.changeLineGlow = (lineGlow: number) => {
      device.queue.writeBuffer(uniformBuffer, 32, new Float32Array([lineGlow]));
    };

    this.changeDebugStep = (step: number) => {
      device.queue.writeBuffer(uniformBuffer, 36, new Float32Array([step]));
    };
    this.changeSunX = (sunX: number) => {
      device.queue.writeBuffer(uniformBuffer, 40, new Float32Array([-sunX]));
    };
    this.changeSunY = (sunY: number) => {
      device.queue.writeBuffer(uniformBuffer, 44, new Float32Array([sunY]));
    };
    this.changeGridLineSpeed = (lineSpeed: number) => {
      device.queue.writeBuffer(
        uniformBuffer,
        48,
        new Float32Array([lineSpeed])
      );
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: CyberpunkGridRenderArgs) {
    this.changeGridLineColor(args.gridLineR, args.gridLineG, args.gridLineB);
    this.changeCanvasWidth(args.canvasWidth);
    this.changeCanvasHeight(args.canvasHeight);
    this.changeTime(args.time);
    this.changeFog(args.fog);
    this.changeLineSize(args.lineSize);
    this.changeLineGlow(args.lineGlow);
    if (this.prevArguments.sunX !== args.sunX) {
      this.changeSunX(args.sunX);
      this.prevArguments.sunX = args.sunX;
    }
    if (this.prevArguments.sunY !== args.sunY) {
      this.changeSunY(args.sunY);
      this.prevArguments.sunY = args.sunY;
    }
    if (this.prevArguments.gridLineSpeed !== args.gridLineSpeed) {
      this.changeGridLineSpeed(args.gridLineSpeed);
      this.prevArguments.gridLineSpeed = args.gridLineSpeed;
    }
    if (args.debugStep !== this.prevDebugStep) {
      this.changeDebugStep(args.debugStep);
      this.prevDebugStep = args.debugStep;
    }
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.currentBindGroup,
    ]);
  }
}
