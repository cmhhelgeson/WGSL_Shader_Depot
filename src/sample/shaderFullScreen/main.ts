/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';

import fullscreenVertWGSL from '../../shaders/fullscreen.vert.wgsl';
import fullscreenFragWGSL from './fullscreen.frag.wgsl';
import { createBindGroupDescriptor } from '../bindGroup';

import GridRenderer from './grid';

const init: SampleInit = async ({ canvas, pageState, gui }) => {
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


  const fragmentBufferSize = Float32Array.BYTES_PER_ELEMENT * 2;
  const fragmentBuffer = device.createBuffer({
    size: fragmentBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });


  const fragmentBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['buffer'],
    [{type: 'uniform'}],
    [
      [{buffer: fragmentBuffer}]
    ],
    'StandardFragment',
    device  
  )


  //Create the render pipeline
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [fragmentBindGroupDescriptor.layout],
    }),
    vertex: {
      module: device.createShaderModule({
        code: fullscreenVertWGSL,
      }),
      entryPoint: 'vertexMain',
    },
    fragment: {
      module: device.createShaderModule({
        code: fullscreenFragWGSL,
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

  const changeCellOriginUniform = () => {
    cellOriginX.setValue(settings.cellOrigin);
    //settings.cellOriginY = settings.cellOrigin;
    cellOriginY.setValue(settings.cellOrigin);
  };

  const settings = {
    shaderType: 'grid',
    gridDimensions: 10.0,
    cellOriginX: 0.0,
    cellOriginY: 0.0,
    cellOrigin: 0.0,
    clampMin: 0.25,
    clampMax: 0.75,
  };

  gui.add(settings, 'shaderType', ['grid', 'step mix']);
  gui.add(settings, 'gridDimensions', 1.0, 30.0).step(1.0);
  const cellOriginX = gui.add(settings, 'cellOriginX', -1.0, 1.0).step(0.1);
  const cellOriginY = gui.add(settings, 'cellOriginY', -1.0, 1.0).step(0.1);
  gui
    .add(settings, 'cellOrigin', -1.0, 1.0)
    .step(0.1)
    .onChange(changeCellOriginUniform);
  gui.add(settings, 'clampMin', 0.0, 1.0).onChange(() => {
    const arr = new Float32Array([settings.clampMin]);
    device.queue.writeBuffer(fragmentBuffer, 0, arr.buffer, arr.byteOffset, arr.byteLength);
  })
  gui.add(settings, 'clampMax', 0.0, 1.0).onChange(() => {
    const arr = new Float32Array([settings.clampMax]);
    device.queue.writeBuffer(fragmentBuffer, 4, arr.buffer, arr.byteOffset, arr.byteLength);
  })

  const gridRenderer = new GridRenderer(
    device,
    presentationFormat,
    renderPassDescriptor
  );

  device.queue.writeBuffer(
    fragmentBuffer,
    0,
    new Float32Array([settings.clampMin, settings.clampMax])
  )

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    switch (settings.shaderType) {
      case 'grid':
        {
          gridRenderer.run(commandEncoder, {
            gridDimensions: settings.gridDimensions,
            cellOriginX: settings.cellOriginX,
            cellOriginY: settings.cellOriginY,
          });
        }
        break;

      case 'step mix':
        {
          const passEncoder =
            commandEncoder.beginRenderPass(renderPassDescriptor);
          passEncoder.setPipeline(pipeline);
          passEncoder.setBindGroup(0, fragmentBindGroupDescriptor.groups[0]);
          passEncoder.draw(6, 1, 0, 0);
          passEncoder.end();
        }
        break;
    }

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const shaderFullScreen: () => JSX.Element = () =>
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
        name: '../../shaders/fullscreen.vert.wgsl',
        contents: fullscreenVertWGSL,
        editable: true,
      },
      {
        name: './fullscreen.frag.wgsl',
        contents: fullscreenFragWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default shaderFullScreen;
