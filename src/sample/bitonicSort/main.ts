import {
  makeSample,
  SampleInit,
} from '../../components/SampleLayout/SampleLayout';
import { SampleInitFactoryWebGPU } from '../../components/SampleLayout/SampleLayoutUtils';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import BitonicDisplayRenderer from './display';
import { BitonicDisplayShader } from './renderShader';
import { NaiveBitonicCompute } from './computeShader';

enum StepEnum {
  NONE = 0,
  FLIP_LOCAL = 1,
  DISPERSE_LOCAL = 2,
  FLIP_DISPERSE_LOCAL = 3,
  FLIP_GLOBAL = 4,
  DISPERSE_GLOBAL = 5,
  FLIP_DISPERSE_GLOBAL = 6,
}

type StepType =
  | 'NONE'
  | 'FLIP_LOCAL'
  | 'DISPERSE_LOCAL'
  | 'FLIP_DISPERSE_LOCAL'
  | 'FLIP_GLOBAL'
  | 'DISPERSE_GLOBAL'
  | 'FLIP_DISPERSE_GLOBAL';

interface SettingsInterface {
  elements: number;
  widthInCells: number;
  heightInCells: number;
  workGroupThreads: number;
  'Prev Step': StepType;
  'Next Step': StepType;
  'Prev Block Height': 0;
  'Next Block Height': 2;
  workLoads: number;
  executeStep: boolean;
  'Randomize Values': () => void;
  'Execute Sort Step': () => void;
}

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ pageState, device, gui, presentationFormat, context }) => {
    const maxWorkgroupsX = device.limits.maxComputeWorkgroupSizeX;

    const workGroupSizes = [];
    for (let i = maxWorkgroupsX * 2; i >= 4; i /= 2) {
      workGroupSizes.push(i);
    }

    const settings: SettingsInterface = {
      //number of cellElements
      elements: 16,
      //width of screen in cells
      widthInCells: 4,
      //height of screen in cells
      heightInCells: 4,
      //number of threads to execute in a workgroup (workgroupThreads, 1, 1)
      workGroupThreads: 16 / 2,
      //Previously executed step
      'Prev Step': 'NONE',
      //Next step to execute
      'Next Step': 'FLIP_LOCAL',
      //Max thread span of previous block
      'Prev Block Height': 0,
      //Max thread span of next block
      'Next Block Height': 2,
      //workloads to dispatch per frame,
      workLoads: 1,
      //Whether we will dispatch a workload this frame
      executeStep: false,
      'Randomize Values': () => {
        return;
      },
      'Execute Sort Step': () => {
        return;
      },
    };

    //Initialize initial elements array
    let elements = new Uint32Array(
      Array.from({ length: settings.elements }, (_, i) => i)
    );

    //Initialize elementsBuffer and elementsStagingBuffer
    const elementsBufferSize = Float32Array.BYTES_PER_ELEMENT * 256,
    //Initialize buffer to provide elements array to shader
    const elementsBuffer = device.createBuffer({
      size: elementsBufferSize,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
    const elementsStagingBuffer = device.createBuffer({
      size: elementsBufferSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    //Create uniform buffer for compute shader
    const computeUniformsBuffer = device.createBuffer({
      //width, height, blockHeight, algo
      size: Float32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const computeBGDescript = createBindGroupDescriptor(
      [0, 1],
      [
        GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        GPUShaderStage.COMPUTE,
      ],
      ['buffer', 'buffer'],
      [{ type: 'storage' }, { type: 'uniform' }],
      [[{ buffer: elementsBuffer }, { buffer: computeUniformsBuffer }]],
      'NaiveBitonicSort',
      device
    );

    let computePipelineLayout: GPUComputePipelineDescriptor = {
      layout: device.createPipelineLayout({
        bindGroupLayouts: [computeBGDescript.bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({
          code: NaiveBitonicCompute(settings.workGroupThreads),
        }),
        entryPoint: 'computeMain',
      },
    };

    let computePipeline = device.createComputePipeline(computePipelineLayout);

    //Create bitonic debug renderer
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: undefined, // Assigned later

          clearValue: { r: 0.1, g: 0.4, b: 0.5, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const bitonicDisplayRenderer = new BitonicDisplayRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['default'],
      computeBGDescript,
      'BitonicDisplay'
    );

    const randomizeElementArray = () => {
      let currentIndex = elements.length;
      // While there are elements to shuffle
      while (currentIndex !== 0) {
        // Pick a remaining element
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        [elements[currentIndex], elements[randomIndex]] = [
          elements[randomIndex],
          elements[currentIndex],
        ];
      }
    };

    const resizeElementArray = () => {
      //Recreate elements array with new length
      elements = new Uint32Array(
        Array.from({ length: settings.elements }, (_, i) => i)
      );
      //Get new width and height of screen display in cells
      const newCellWidth =
        Math.sqrt(settings.elements) % 2 === 0
          ? Math.floor(Math.sqrt(settings.elements))
          : Math.floor(settings.elements / 4);
      const newCellHeight =
        Math.sqrt(settings.elements) % 2 === 0
          ? Math.floor(Math.sqrt(settings.elements))
          : Math.floor(settings.elements / 2);
      //Re-set workgroup threads to half length of elements
      workGroupThreadsCell.setValue(settings.elements / 2);
      console.log(settings.workGroupThreads);
      //Create new shader invocation with workgroupSize that reflects number of threads
      computePipelineLayout.compute = {
        module: device.createShaderModule({
          code: NaiveBitonicCompute(settings.elements / 2),
        }),
        ...computePipelineLayout.compute,
      };
      computePipeline = device.createComputePipeline(computePipelineLayout);
      //Randomize array elements
      randomizeElementArray();
    };

    randomizeElementArray();

    gui.add(settings, 'elements', workGroupSizes).onChange(resizeElementArray);
    gui.add(settings, 'Execute Sort Step').onChange(() => {
      settings.executeStep = true;
    });
    gui.add(settings, 'Randomize Values').onChange(randomizeElementArray);
    const executionInformationFolder = gui.addFolder('Execution Information');
    const prevStepCell = executionInformationFolder.add(settings, 'Prev Step');
    const prevBlockHeightCell = executionInformationFolder.add(
      settings,
      'Prev Block Height'
    );
    const nextStepCell = executionInformationFolder.add(settings, 'Next Step');
    const nextBlockHeightCell = executionInformationFolder.add(
      settings,
      'Next Block Height'
    );
    const workGroupThreadsCell = executionInformationFolder.add(
      settings,
      'workGroupThreads'
    );
    const widthInCellsCell = executionInformationFolder.add(
      settings,
      'workgro'
    )
    //Make gui non-interactive
    prevStepCell.domElement.style.pointerEvents = 'none';
    prevBlockHeightCell.domElement.style.pointerEvents = 'none';
    nextStepCell.domElement.style.pointerEvents = 'none';
    nextBlockHeightCell.domElement.style.pointerEvents = 'none';
    workGroupThreadsCell.domElement.style.pointerEvents = 'none';

    let highestBlockHeight = 2;
    let nextBlockHeight = 2;

    async function frame() {
      if (!pageState.active) return;

      //Write elements buffer
      device.queue.writeBuffer(
        elementsBuffer,
        0,
        elements.buffer,
        elements.byteOffset,
        elements.byteLength
      );

      //Write compute Uniforms
      device.queue.writeBuffer(
        computeUniformsBuffer,
        0,
        new Float32Array([
          settings.widthInCells,
          settings.heightInCells,
          StepEnum[settings['Next Step']],
          settings['Next Block Height'],
        ])
      );

      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      bitonicDisplayRenderer.startRun(commandEncoder, {
        width:
          Math.sqrt(settings.elements) % 2 === 0
            ? Math.floor(Math.sqrt(settings.elements))
            : Math.floor(settings.elements / 4),
        height:
          Math.sqrt(settings.elements) % 2 === 0
            ? Math.floor(Math.sqrt(settings.elements))
            : Math.floor(settings.elements / 2),
      });
      if (settings.executeStep) {
        //const computePassEncoder = commandEncoder.beginComputePass({});
        //computePassEncoder.dispatchWorkgroups(1);
        prevStepCell.setValue(settings['Next Step']);
        nextBlockHeight /= 2;
        if (nextBlockHeight === 1) {
          highestBlockHeight *= 2;
          nextStepCell.setValue('FLIP_LOCAL');
          nextBlockHeightCell.setValue(highestBlockHeight);
        } else {
          nextBlockHeightCell.setValue(nextBlockHeight);
          nextStepCell.setValue('DISPERSE_LOCAL');
        }
        settings.executeStep = false;
      }
      //Put shader output in mapped buffer
      commandEncoder.copyBufferToBuffer(
        elementsBuffer,
        0,
        elementsStagingBuffer,
        0,
        elementsBufferSize,
      );
      device.queue.submit([commandEncoder.finish()]);

      //Copy GPU data to CPU
      await elementsStagingBuffer.mapAsync(
        GPUMapMode.READ,
        0,
        elementsBufferSize
      );
      const copyElementsBuffer = elementsStagingBuffer.getMappedRange(
        0,
        elementsBufferSize
      );
      const data = copyElementsBuffer.slice(0);
      const output = new Uint32Array(data);
      elementsStagingBuffer.unmap();
      elements = output;

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  ['Add Explanations']
).then((resultInit) => (init = resultInit));

const bitonicSortExample: () => JSX.Element = () =>
  makeSample({
    name: 'Bitonic Sort',
    description:
      'A compute shader which executes a bitonic sort on an array of data',
    init,
    coordinateSystem: 'WEBGL',
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './bitonicDisplay.frag.wgsl',
        contents: BitonicDisplayShader(),
        editable: true,
      },
    ],
    filename: __filename,
  });

export default bitonicSortExample;
