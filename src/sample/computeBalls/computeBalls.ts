//Adapters are the translation layer between an operating system's
//API to WebGPU

import fullscreenVertWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import {
  BaseComputeProgramClass,
  BaseComputeProgramTypes,
} from '../../utils/computeProgram';
import { Base2DRendererClass, BaseRenderer } from '../../utils/renderProgram';
import gridFragWGSL from './grid.frag.wgsl';
import gridDebugFragWGSL from './gridDebug.frag.wgsl';

type GridRendererArgumentsType = {
  gridDimensions: number;
  cellOriginX: number;
  cellOriginY: number;
  lineWidth: number;
  debugStep: number;
};

export default class computeBalls
  extends BaseComputeProgramClass
  implements BaseComputeProgramTypes
{
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  readonly renderPassDescriptor: GPURenderPassDescriptor;
  readonly pipeline: GPUComputePipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
  changeDebugStep: (step: number) => void;
  switchBindGroup(name: string): void;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    label: string,
    debug = false
  ) {
    super();
    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };
    this.renderPassDescriptor = renderPassDescriptor;

    let bufferElements = 4;
    if (debug) {
      bufferElements += 1;
    }

    const uniformBufferSize = Float32Array.BYTES_PER_ELEMENT * bufferElements;
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgDescript = createBindGroupDescriptor(
      [0],
      [GPUShaderStage.FRAGMENT],
      ['buffer'],
      [{ type: 'uniform' }],
      [[{ buffer: uniformBuffer }]],
      'Grid',
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
      
    )

    this.changeDebugStep = (step: number) => {
      if (debug) {
        device.queue.writeBuffer(uniformBuffer, 16, new Float32Array([step]));
      }
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: GridRendererArgumentsType) {
    this.changeDimensions(args.gridDimensions);
    this.changeCellOriginX(args.cellOriginX);
    this.changeCellOriginY(args.cellOriginY);
    this.changeLineWidth(args.lineWidth);
    this.changeDebugStep(args.debugStep);
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.currentBindGroup,
    ]);
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

if (!navigator.gpu) throw Error('WebGPU not supported');

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw Error("Couldn't request WebGPU adapter.");

//requestDevice will return a device that represents what WebGPU
//considers to be the lowest common denominator GPU
const device = await adapter.requestDevice();
if (!device) throw Error("Couldn't request WebGPU logical device.");

//WebGPU facilitates the creation of two types of pipelines
// 1. Render pipeline: Renders images to the screen
// 2. Compute pipeline: Does a trivial amount of work

//global_invocation_id is the unique id of a unit of work within an entire grid
//local_invocation_id is the unique id of a unit of work within a workgroup
const ballComputeModule = device.createShaderModule({
  //BindGroup 0 with layout bindGroupLayoutOne
  //Binding 1: The entry within our bindgroup, a storage buffer
  code: `
    struct Ball {
      radius: f32,
      position: vec2<f32>,
      velocity: vec2<f32>,
    }

    struct UniformData {
      canvasWidth: i32,
      canvasHeight: i32
    }

    @group(0) @binding(0)
    var<storage, read> input: array<Ball>;

    @group(0) @binding(1)
    var<storage, read_write> output: array<Ball>;

    @group(0) @binding(2)
    var<uniform> uniforms: UniformData;

    const TIME_STEP: f32 = 0.016;

    @compute @workgroup_size(64)
    fn main( 
      @builtin(global_invocation_id) global_id: vec3<u32>,
    ) {
      let num_balls = arrayLength(&output);
      if (global_id.x >= arrayLength(&output)) {
        return;
      }
      let src_ball = input[global_id.x];
      let dst_ball = &output[global_id.x];

      (*dst_ball) = src_ball;
      (*dst_ball).position = (*dst_ball).position + (*dst_ball).velocity * TIME_STEP;
      if ( 
        (*dst_ball).position[0] >= f32(uniforms.canvasWidth) ||
        (*dst_ball).position[0] <= 0.0
      ) {
        (*dst_ball).velocity[0] = src_ball.velocity[0] * -1;
      }

      if ( 
        (*dst_ball).position[1] >= f32(uniforms.canvasHeight) ||
        (*dst_ball).position[1] <= 0.0
      ) {
        (*dst_ball).velocity[1] = src_ball.velocity[1] * -1;
      }
    }
  `,
});
//four bytes will be added to end of output since allignment is 8
//and f32 has a size of four bytes

//We have 64 threads in each workgroup, but each piece of work within a workload is unique
//Therefore, our output will go from 0, 1001, 2002, ...630063
//But the local_invocation.id, which only gets indexes within a workgroup,
//Will go back to 0 when it gets to the last thread within a workgroup
//and the program begins executing another workgroup. Global_invocation_id
//continues to increase, as it is tracking the index of a piece of work
//within the entire workload.

//This is just a layout, we are not creating the resources
//That will populate this layout just yet
const bindGroupLayoutOne = device.createBindGroupLayout({
  entries: [
    //Input buffer
    {
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: 'read-only-storage',
      },
    },
    //Output buffer that will be mapped to stagingBuffer later
    {
      //Resource Identifier within Group
      binding: 1,
      //Resource accessible to either vert, frag, or compute shader
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: 'storage',
      },
    },
    //Uniforms Buffer
    {
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: 'uniform',
      },
    },
  ],
});

const pipeline = device.createComputePipeline({
  layout: device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayoutOne],
  }),
  compute: {
    module: ballComputeModule,
    entryPoint: 'main',
  },
});

const numBalls = 200;
//Create the buffer that will be associated with binding 1
const BUFFER_SIZE = numBalls * 6 * Float32Array.BYTES_PER_ELEMENT;

//Group 0 Binding 0
const input = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
//.STORAGE: Can be written to by GPU
//.COPY_SRC: Can act as the source for a copy operation
//Producer of data
//Group 0 Binding 1
const output = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
});

//Group 0 Binding 2
const uniformsBuffer = device.createBuffer({
  size: 8,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

//.MAP_READ. Can be read from the CPU
//.COPY_DST Can be the destination for a copy operation
const stagingBuffer = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});

//Above are GPU Buffers
//Cannot be read or written to unless these conditions are met
// 1. Usage is set as MAP_READ or MAP_WRITE
// 2. Need to be mapped to an ArrayBuffer with a separate API Call

const bindGroup = device.createBindGroup({
  layout: bindGroupLayoutOne,
  entries: [
    {
      binding: 0,
      resource: {
        buffer: input,
      },
    },
    {
      binding: 1,
      resource: {
        buffer: output,
      },
    },
    {
      binding: 2,
      resource: {
        buffer: uniformsBuffer,
      },
    },
  ],
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
