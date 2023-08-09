//Adapters are the translation layer between an operating system's
//API to WebGPU

import {
  BaseComputeProgramClass,
  BaseComputeProgramTypes,
} from '../../utils/computeProgram';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import ComputeBallsWGSL from './balls.comp.wgsl';

interface ComputeBallsArgumentType {
  ballColorR: number;
  ballColorG: number;
  ballColorB: number;
  numBalls: number;
}

const numBalls = 200;
const ballInfoSize = 6;
const BUFFER_SIZE = numBalls * ballInfoSize * Float32Array.BYTES_PER_ELEMENT;

export default class computeBalls
  extends BaseComputeProgramClass
  implements BaseComputeProgramTypes
{
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  readonly computePassDescriptor: GPUComputePassDescriptor;
  readonly pipeline: GPUComputePipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
  changeDebugStep: (step: number) => void;
  switchBindGroup(name: string): void;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPUComputePassDescriptor,
    bindGroupNames: string[],
    label: string,
    debug = false
  ) {
    super();
    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };
    this.computePassDescriptor = renderPassDescriptor;

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
      size: Float32Array.BYTES_PER_ELEMENT * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
      'Balls',
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
  }

  startRun(commandEncoder: GPUCommandEncoder) {
    super.executeRun(
      commandEncoder,
      this.computePassDescriptor,
      this.pipeline,
      [this.currentBindGroup],
      Math.ceil(BUFFER_SIZE / 64)
    );
  }
}

const canvas = document.querySelector('canvas') as HTMLCanvasElement;

const context = canvas.getContext('2d') as CanvasRenderingContext2D;

const randomBetween = (min: number, max: number) => {
  if (min > max) {
    [min, max] = [max, min];
  }
  return Math.random() * (max - min) + min;
};

const addHexColor = (c1: string, c2: string) => {
  const octetsRegex = /^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
  const m1 = c1.match(octetsRegex);
  const m2 = c2.match(octetsRegex);
  if (!m1 || !m2) {
    throw new Error(`invalid hex color triplet(s): ${c1} / ${c2}`);
  }
  return [1, 2, 3]
    .map((i) => {
      const sum = parseInt(m1[i], 16) + parseInt(m2[i], 16);
      if (sum > 0xff) {
        throw new Error(
          `octet ${i} overflow: ${m1[i]}+${m2[i]}=${sum.toString(16)}`
        );
      }
      return sum.toString(16).padStart(2, '0');
    })
    .join('');
};

const returnAnimationFrame = () => {
  return new Promise((e: FrameRequestCallback) => requestAnimationFrame(e));
};

let firstRenderComplete = false;

const renderBalls = (ballData: Float32Array, color: string) => {
  //Saves entire state of canvas
  context.save();
  //Add a scaling transformation to the canvas units. 1 unit on canvas = 1 pixel unit
  //Code flips the context horizontally
  //context.scale(-1, 1);
  //Will make bottom of canvas y = 0 and top of canvas y = canvas.height
  //context.translate(0, -context.canvas.height),
  //context.clearRect(0, 0, context.canvas.width, context.canvas.height),
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

//four bytes will be added to end of output since allignment is 8
//and f32 has a size of four bytes

//We have 64 threads in each workgroup, but each piece of work within a workload is unique
//Therefore, our output will go from 0, 1001, 2002, ...630063
//But the local_invocation.id, which only gets indexes within a workgroup,
//Will go back to 0 when it gets to the last thread within a workgroup
//and the program begins executing another workgroup. Global_invocation_id
//continues to increase, as it is tracking the index of a piece of work
//within the entire workload.
//Group 0 Binding 0

//.MAP_READ. Can be read from the CPU
//.COPY_DST Can be the destination for a copy operation
const stagingBuffer = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});

let inputBalls = new Float32Array(new ArrayBuffer(BUFFER_SIZE));
for (let i = 0; i < numBalls; i += 6) {
  inputBalls[i + 0] = randomBetween(2, 10);
  inputBalls[i + 1] = 0;
  inputBalls[i + 2] = randomBetween(0, context.canvas.width);
  inputBalls[i + 3] = randomBetween(0, context.canvas.height);
  inputBalls[i + 4] = randomBetween(-100, 100);
  inputBalls[i + 5] = randomBetween(-100, 100);
}

const uniformCanvasArea = new Int32Array(
  new ArrayBuffer(2 * Int32Array.BYTES_PER_ELEMENT)
);
uniformCanvasArea[0] = context.canvas.width;
uniformCanvasArea[1] = context.canvas.height;
device.queue.writeBuffer(uniformsBuffer, 0, uniformCanvasArea.buffer);
let color = [255, 0, 0];
let addColor = 0.5;
for (;;) {
  //Will efficiently write cpu data onto our gpu Storage Buffer
  //Only need to write to buffers in every loop if the data changes
  device.queue.writeBuffer(input, 0, inputBalls);
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  //PassEncoder codes the setup and invocation of pipelines
  passEncoder.setPipeline(pipeline);
  //Will correlate our created bindgroup to the bindgroup at index 0 of
  //the bindGroupLayouts array of our pipeline. In this case, index 0
  //of that array has bindGroupLayoutOne
  passEncoder.setBindGroup(0, bindGroup);
  //This will dispatch one workgroup within the workload
  //Specifically workgroup x: 1, y: 1, z: 1.
  //Remember each workgroup has a workgroup_size of 64
  //Meaning there are 64 items in each workgroup
  //passEncoder.dispatchWorkgroups(1);
  passEncoder.dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 64));
  //x = 64 y = 1 z = 1 work group indexes
  //w_x = 1 w_y = 1 w_z = 1 workload indexes
  //1 workgroup on x dimension
  //1 workgroup on y dimension
  //1 workgroup on z dimension
  //Multiplied together, that is 64 threads being spanned on the GPU
  passEncoder.end();
  //Define command that copies region of one buffer to region
  //of another buffer
  commandEncoder.copyBufferToBuffer(
    //copy this buffer
    output,
    //from offset 0
    0,
    //to this buffer
    stagingBuffer,
    //at offset 0
    0,
    //and copy this number of bytes
    BUFFER_SIZE
  );
  //Once this is called, the GPU CommandBuffer can not be used to record
  //more commands. Invalidating operation
  const commands = commandEncoder.finish();
  device.queue.submit([commands]);

  //Map the data inside the GPUStagingBuffer
  //We don't map directly from the output buffer. That would incur
  //performance penalties
  await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);

  //Request subsection of buffer memory
  const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
  //Get copy of data from GPU
  const data = copyArrayBuffer.slice(0);
  let computedOutput = new Float32Array(data);
  //Unmap stagingBuffer all that data goes by by
  stagingBuffer.unmap();
  const finalColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  renderBalls(computedOutput, finalColor);
  if (color[1] >= 255 || color[1] < 0) {
    addColor = addColor * -1;
  }
  color[1] += addColor;
  color[2] += addColor;
  //Set the current input to the computed result of the GPU calculation
  inputBalls = computedOutput;
  await returnAnimationFrame();
}
