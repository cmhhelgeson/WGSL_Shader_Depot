import {
  BaseComputeProgramClass,
  BaseComputeProgramTypes,
} from '../../utils/computeProgram';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import ComputeBallsWGSL from './balls.comp.wgsl';

interface ComputeBallsArguments {
  ballColorR: number;
  ballColorG: number;
  ballColorB: number;
  context: CanvasRenderingContext2D;
}

const numBalls = 200;
const ballInfoSize = 6;
const BUFFER_SIZE = numBalls * ballInfoSize * Float32Array.BYTES_PER_ELEMENT;

const randomBetween = (min: number, max: number) => {
  if (min > max) {
    [min, max] = [max, min];
  }
  return Math.random() * (max - min) + min;
};

const renderBalls = (
  context: CanvasRenderingContext2D,
  ballData: Float32Array,
  color: string
) => {
  //Saves entire state of canvas
  context.save();
  context.fillStyle = color;
  context.fillRect(0, 0, 5, 5);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  for (let a = 0; a < ballData.length; a += 6) {
    const radius = ballData[a + 0];
    const posX = ballData[a + 2];
    const posY = ballData[a + 3];
    const velX = ballData[a + 4];
    const velY = ballData[a + 5];
    let c = Math.atan(velY / (velX === 0 ? Number.EPSILON : velX));
    velX < 0 && (c += Math.PI);
    const P = posX + Math.cos(c) * Math.sqrt(2) * radius;
    const m = posY + Math.sin(c) * Math.sqrt(2) * radius;
    context.beginPath(),
      context.arc(posX, posY, radius, 0, 2 * Math.PI, !0),
      context.moveTo(P, m),
      context.arc(posX, posY, radius, c - Math.PI / 4, c + Math.PI / 4, !0),
      context.lineTo(P, m),
      context.closePath(),
      context.fill();
  }
  context.restore();
};

export default class ComputeBalls
  extends BaseComputeProgramClass
  implements BaseComputeProgramTypes
{
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  readonly pipeline: GPUComputePipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
  changeDebugStep: (step: number) => void;
  switchBindGroup: (name: string) => void;
  inputData: Float32Array;
  writeToInput: () => void;
  endRun: (encoder: GPUCommandEncoder, args: ComputeBallsArguments) => void;

  constructor(
    device: GPUDevice,
    bindGroupNames: string[],
    label: string,
    context: CanvasRenderingContext2D,
    debug = false
  ) {
    super();
    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    const inputBuffer = device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const outputBuffer = device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    //Group 0 Binding 2
    const uniformsBuffer = device.createBuffer({
      size: Int32Array.BYTES_PER_ELEMENT * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const stagingBuffer = device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const bgDescript = createBindGroupDescriptor(
      [0, 1, 2],
      [GPUShaderStage.COMPUTE, GPUShaderStage.COMPUTE, GPUShaderStage.COMPUTE],
      ['buffer', 'buffer', 'buffer'],
      [{ type: 'storage' }, { type: 'storage' }, { type: 'uniform' }],
      [
        [
          { buffer: inputBuffer },
          { buffer: outputBuffer },
          { buffer: uniformsBuffer },
        ],
      ],
      label,
      device
    );

    this.currentBindGroup = bgDescript.bindGroups[0];
    this.currentBindGroupName = bindGroupNames[0];

    this.bindGroupMap = {};
    bgDescript.bindGroups.forEach((bg, idx) => {
      this.bindGroupMap[bindGroupNames[idx]] = bg;
    });

    this.pipeline = super.createPipeline(
      device,
      'ComputeBalls',
      [bgDescript.bindGroupLayout],
      ComputeBallsWGSL
    );

    this.changeDebugStep = (step: number) => {
      if (debug) {
        device.queue.writeBuffer(uniformsBuffer, 16, new Float32Array([step]));
      }
    };

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.writeToInput = () => {
      device.queue.writeBuffer(inputBuffer, 0, this.inputData);
    };

    this.inputData = new Float32Array(new ArrayBuffer(BUFFER_SIZE));
    for (let i = 0; i < numBalls; i += 6) {
      this.inputData[i + 0] = randomBetween(2, 10);
      this.inputData[i + 1] = 0;
      this.inputData[i + 2] = randomBetween(0, context.canvas.width);
      this.inputData[i + 3] = randomBetween(0, context.canvas.height);
      this.inputData[i + 4] = randomBetween(-100, 100);
      this.inputData[i + 5] = randomBetween(-100, 100);
    }

    const uniformCanvasArea = new Int32Array(
      new ArrayBuffer(2 * Int32Array.BYTES_PER_ELEMENT)
    );
    uniformCanvasArea[0] = context.canvas.width;
    uniformCanvasArea[1] = context.canvas.height;
    device.queue.writeBuffer(uniformsBuffer, 0, uniformCanvasArea.buffer);

    this.endRun = async (
      commandEncoder: GPUCommandEncoder,
      args: ComputeBallsArguments
    ) => {
      commandEncoder.copyBufferToBuffer(
        outputBuffer,
        0,
        stagingBuffer,
        0,
        BUFFER_SIZE
      );
      device.queue.submit([commandEncoder.finish()]);

      //Get the computed output from the staging buffer
      await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);

      //Request subsection of buffer memory
      const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
      //Get copy of data from GPU
      const data = copyArrayBuffer.slice(0);
      const computedOutput = new Float32Array(data);
      //Unmap stagingBuffer all that data goes by by
      stagingBuffer.unmap();
      const finalColor = `rgb(${args.ballColorR}, ${args.ballColorG}, ${args.ballColorB})`;
      renderBalls(args.context, computedOutput, finalColor);
      this.inputData = computedOutput;
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: ComputeBallsArguments) {
    this.writeToInput();
    super.executeRun(
      commandEncoder,
      this.pipeline,
      [this.currentBindGroup],
      Math.ceil(BUFFER_SIZE / 64)
    );
    this.endRun(commandEncoder, args);
  }
}
