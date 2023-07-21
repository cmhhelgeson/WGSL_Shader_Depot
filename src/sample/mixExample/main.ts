/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import fullscreenVertWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';
import mixFragWGSL from './mix.frag.wgsl';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { createUniformDescriptor } from '../../utils/uniform';
import { create2DVertexModule } from '../../utils/renderProgram';

const init: SampleInit = async ({ canvas, pageState, gui}) => {
  //Normal setup
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const settings = {
    shaderType: 'crt',
    gridDimensions: 10.0,
    cellOriginX: 0.0,
    cellOriginY: 0.0,
    cellOrigin: 0.0,
    clampMin: 0.25,
    clampMax: 0.75,
    lineWidth: 1.0,
    pulseWidth: 2.0,
    pulseLine: true,
    pulseSpeed: 0,
    textureName: 'dog',
    debugStep: 0
  };

  const fragBufferDescriptor = createUniformDescriptor(
    'Fragment_Buffer',
    4,
    [settings.clampMin, settings.clampMax, 0, 1.0 / canvas.width],
    device
  );

  const fragmentBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['buffer'],
    [{ type: 'uniform' }],
    [[{ buffer: fragBufferDescriptor.buffer }]],
    'StandardFragment',
    device
  );

  //Create the render pipeline
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [fragmentBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: create2DVertexModule(device, "WEBGL"),
    fragment: {
      module: device.createShaderModule({
        code: mixFragWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'none',
    },
  });

  console.log(presentationFormat);

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


  gui.add(settings, 'clampMin', 0.0, 1.0).onChange(() => {
    const arr = new Float32Array([settings.clampMin]);
    device.queue.writeBuffer(
      fragBufferDescriptor.buffer,
      0,
      arr.buffer,
      arr.byteOffset,
      arr.byteLength
    );
  });
  gui.add(settings, 'clampMax', 0.0, 1.0).onChange(() => {
    const arr = new Float32Array([settings.clampMax]);
    device.queue.writeBuffer(
      fragBufferDescriptor.buffer,
      4,
      arr.buffer,
      arr.byteOffset,
      arr.byteLength
    );
  });

  let lastTime = performance.now();
  let timeElapsed = 0;

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;
    const currentTime = performance.now();

    timeElapsed += Math.min(1 / 60, (currentTime - lastTime) / 1000);

    const dtArr = new Float32Array([timeElapsed]);

    lastTime = currentTime;

    device.queue.writeBuffer(
      fragBufferDescriptor.buffer,
      8,
      dtArr.buffer,
      dtArr.byteOffset,
      dtArr.byteLength
    );

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(
      0,
      fragmentBindGroupDescriptor.bindGroups[0]
    );
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const mixExample: () => JSX.Element = () =>
  makeSample({
    name: 'Fullscreen Shader',
    description: 'Shader examples',
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: '../../shaders/fullscreenWebGL.vert.wgsl',
        contents: fullscreenVertWGSL,
        editable: true,
      },
      {
        name: './fullscreen.frag.wgsl',
        contents: mixFragWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default mixExample;