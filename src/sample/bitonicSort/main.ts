import {
  makeSample,
  SampleInit,
} from '../../components/SampleLayout/SampleLayout';
import { SampleInitFactoryWebGPU } from '../../components/SampleLayout/SampleLayoutUtils';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import BitonicDisplayRenderer from './display';
import { BitonicDisplayShader } from './render';
import { NaiveBitonicCompute } from './compute';

enum StepType {
  NONE = 0,
  FLIP_LOCAL = 1,
  DISPERSE_LOCAL = 2,
  FLIP_DISPERSE_LOCAL = 3,
  FLIP_GLOBAL = 4,
  DISPERSE_GLOBAL = 5,
  FLIP_DISPERSE_GLOBAL = 6,
}

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ pageState, device, gui, presentationFormat, context }) => {
    const maxWorkgroupsX = device.limits.maxComputeWorkgroupSizeX;
    const startNumElements = 16;

    const workGroupSizes = [];
    for (let i = maxWorkgroupsX * 2; i >= 4; i /= 2) {
      workGroupSizes.push(i);
    }

    const settings = {
      elements: startNumElements,
      workGroupThreads: startNumElements / 2,
      'Prev Step': 'None',
      'Next Step': 'Flip',
      'Prev Block Height': 0,
      'Next Block Height': 2,
      workLoads: 1,
      executeStep: false,
      'Randomize Values': () => {
        return;
      },
      'Execute Sort Step': () => {
        return;
      },
    };

    let elements = new Uint32Array(Array.from({ length: 16 }, (_, i) => i));

    const elementsBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 256,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
    const uniformsBuffer = device.createBuffer({
      //width, height, blockHeight, algo
      size: Float32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

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

    const computeBGDescript = createBindGroupDescriptor(
      [0, 1],
      [
        GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        GPUShaderStage.COMPUTE,
      ],
      ['buffer', 'buffer'],
      [{ type: 'storage' }, { type: 'uniform' }],
      [[{ buffer: elementsBuffer }, { buffer: uniformsBuffer }]],
      'NaiveBitonicSort',
      device
    );

    const bitonicDisplayRenderer = new BitonicDisplayRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['default'],
      computeBGDescript,
      'BitonicDisplay'
    );

    let computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [computeBGDescript.bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({
          code: NaiveBitonicCompute(settings.workGroupThreads),
        }),
        entryPoint: 'computeMain',
      },
    });

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

    randomizeElementArray();

    const resizeElementArray = () => {
      elements = new Uint32Array(
        Array.from({ length: settings.elements }, (_, i) => i)
      );
      workGroupThreadsCell.setValue(settings.elements / 2);
      computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
          bindGroupLayouts: [computeBGDescript.bindGroupLayout],
        }),
        compute: {
          module: device.createShaderModule({
            code: NaiveBitonicCompute(settings.workGroupThreads),
          }),
          entryPoint: 'computeMain',
        },
      });
      randomizeElementArray();
    };

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
    workGroupThreadsCell.domElement.style.pointerEvents = 'none';

    let greenBlockHeight = 2;
    let yellowBlockHeight = 2;

    async function frame() {
      if (!pageState.active) return;

      device.queue.writeBuffer(
        elementsBuffer,
        0,
        elements.buffer,
        elements.byteOffset,
        elements.byteLength
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
        yellowBlockHeight = yellowBlockHeight / 2;
        if (yellowBlockHeight === 1) {
          const newBlockHeight = greenBlockHeight * 2;
          nextStepCell.setValue('FLIP_LOCAL');
          nextBlockHeightCell.setValue(newBlockHeight);
          greenBlockHeight = newBlockHeight;
        } else {
          nextBlockHeightCell.setValue(yellowBlockHeight);
          nextStepCell.setValue('DISPERSE_LOCAL');
        }
      }
      device.queue.submit([commandEncoder.finish()]);
      settings.executeStep = false;
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
