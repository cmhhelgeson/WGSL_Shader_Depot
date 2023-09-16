import {
  makeSample,
  SampleInit,
} from '../../components/SampleLayout/SampleLayout';
import { SampleInitFactoryWebGPU } from '../../components/SampleLayout/SampleLayoutUtils';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import BitonicDisplayRenderer from './display';
import { BitonicDisplayShader } from './shader';

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ pageState, device, gui, presentationFormat, context }) => {
    const maxWorkgroupsX = device.limits.maxComputeWorkgroupSizeX;

    const workGroupSizes = [];
    for (let i = maxWorkgroupsX; i >= 4; i /= 2) {
      workGroupSizes.push(i);
    }

    const settings = {
      elements: 16,
      'Randomize Values': () => {
        return;
      },
    };

    let elements = new Uint32Array(Array.from({ length: 16 }, (_, i) => i));

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
      randomizeElementArray();
    };

    gui.add(settings, 'elements', workGroupSizes).onChange(resizeElementArray);
    gui.add(settings, 'Randomize Values').onChange(randomizeElementArray);

    const elementsBuffer = device.createBuffer({
      size: 256,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
    const uniformsBuffer = device.createBuffer({
      size: Int32Array.BYTES_PER_ELEMENT,
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

    /*const computePipeline = device.createComputePipeline({
      label: 'NaiveBitonic.pipeline',
      layout: device.createPipelineLayout({
        label: 'NaiveBitonic.pipelineLayout',
        bindGroupLayouts: [computeBGDescript.bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({
          code: NaiveBitonicWGSL,
        }),
        entryPoint: 'computeMain',
      },
    }); */

    async function frame() {
      if (!pageState.active) return;

      console.log(elements);

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
          settings.elements % 2 === 0
            ? Math.floor(Math.sqrt(settings.elements))
            : Math.floor(settings.elements / 4),
        height:
          settings.elements % 2 === 0
            ? Math.floor(Math.sqrt(settings.elements))
            : Math.floor(settings.elements / 2),
      });
      device.queue.submit([commandEncoder.finish()]);
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
