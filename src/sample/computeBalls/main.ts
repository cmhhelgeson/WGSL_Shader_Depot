import {
  makeSample,
  SampleInit,
} from '../../components/SampleLayout/SampleLayout';
import { SampleInitFactoryCanvas2D } from '../../components/SampleLayout/SampleLayoutUtils';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import BallsComputeWGSL from './balls.comp.wgsl';

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

let init: SampleInit;
SampleInitFactoryCanvas2D(
  ({ pageState, context, device }) => {
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
      [{ type: 'read-only-storage' }, { type: 'storage' }, { type: 'uniform' }],
      [
        [
          { buffer: inputBuffer },
          { buffer: outputBuffer },
          { buffer: uniformsBuffer },
        ],
      ],
      'ComputeBalls',
      device
    );

    let inputData = new Float32Array(new ArrayBuffer(BUFFER_SIZE));
    for (let i = 0; i < numBalls; i += 6) {
      inputData[i + 0] = randomBetween(2, 10);
      inputData[i + 1] = 0;
      inputData[i + 2] = randomBetween(0, context.canvas.width);
      inputData[i + 3] = randomBetween(0, context.canvas.height);
      inputData[i + 4] = randomBetween(-100, 100);
      inputData[i + 5] = randomBetween(-100, 100);
    }

    const uniformCanvasArea = new Int32Array(
      new ArrayBuffer(2 * Int32Array.BYTES_PER_ELEMENT)
    );
    uniformCanvasArea[0] = context.canvas.width;
    uniformCanvasArea[1] = context.canvas.height;
    device.queue.writeBuffer(uniformsBuffer, 0, uniformCanvasArea.buffer);

    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bgDescript.bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({
          code: BallsComputeWGSL,
        }),
        entryPoint: 'computeMain',
      },
    });

    async function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;

      device.queue.writeBuffer(inputBuffer, 0, inputData);
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      //PassEncoder codes the setup and invocation of pipelines
      passEncoder.setPipeline(pipeline);
      //Will correlate our created bindgroup to the bindgroup at index 0 of
      //the bindGroupLayouts array of our pipeline. In this case, index 0
      //of that array has bindGroupLayoutOne
      passEncoder.setBindGroup(0, bgDescript.bindGroups[0]);
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
        outputBuffer,
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
      const computedOutput = new Float32Array(data);
      //Unmap stagingBuffer all that data goes by by
      stagingBuffer.unmap();
      const finalColor = `rgb(${255}, ${0}, ${0})`;
      renderBalls(context, computedOutput, finalColor);
      //Set the current input to the computed result of the GPU calculation
      inputData = computedOutput;

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  ['Test']
).then((resultInit) => (init = resultInit));

const computeBallsExample: () => JSX.Element = () =>
  makeSample({
    name: 'Surma Balls',
    description:
      "A compute shader which performs basic position and velocity calculations on a series of ball objects. Based on Surma's tutorial: https://surma.dev/things/webgpu/",
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './balls.compute.wgsl',
        contents: BallsComputeWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default computeBallsExample;
