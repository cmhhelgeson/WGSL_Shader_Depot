/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import fullscreenVertWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';
import fullscreenFragWGSL from './fullscreen.frag.wgsl';
import { createBindGroupDescriptor } from '../../utils/bindGroup';

import GridRenderer from './grid';
import { createUniformDescriptor } from '../../utils/uniform';
import { cosineInterpolate } from '../../utils/interpolate';
import CRTRenderer from './crt';
import { createTextureFromImage } from '../../utils/texture';

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

  const changeCellOriginUniform = () => {
    cellOriginX.setValue(settings.cellOrigin);
    //settings.cellOriginY = settings.cellOrigin;
    cellOriginY.setValue(settings.cellOrigin);
  };

  gui.add(settings, 'shaderType', ['grid', 'step mix', 'crt']);
  gui.add(settings, 'gridDimensions', 1.0, 100.0).step(1.0);
  const cellOriginX = gui.add(settings, 'cellOriginX', -1.0, 1.0).step(0.1);
  const cellOriginY = gui.add(settings, 'cellOriginY', -1.0, 1.0).step(0.1);
  gui
    .add(settings, 'cellOrigin', -1.0, 1.0)
    .step(0.1)
    .onChange(changeCellOriginUniform);
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
  gui.add(settings, 'lineWidth', 1.0, 8.0).step(0.1);
  gui.add(settings, 'pulseWidth', 2.0, 9.0).step(0.1);
  gui.add(settings, 'pulseLine');
  gui.add(settings, 'pulseSpeed', 0, 100).step(10);
  gui.add(settings, 'textureName', ['dog', 'cat'])
  gui.add(settings, 'debugStep', 0, 2).step(1)

  const gridRenderer = new GridRenderer(
    device,
    presentationFormat,
    renderPassDescriptor
  );

  
  let dogTexture: GPUTexture 
  {
    const response = await fetch(new URL('../../../assets/img/dog.jpg', import.meta.url).toString());
    const bitmap = await createImageBitmap(await response.blob());
    dogTexture = createTextureFromImage(device, bitmap)
  }
  let catTexture: GPUTexture;
  {
    const response = await fetch(new URL('../../../assets/img/cat.jpg', import.meta.url).toString());
    const bitmap = await createImageBitmap(await response.blob());
    catTexture = createTextureFromImage(device, bitmap);
  }

  const crtRenderer = new CRTRenderer(
    device,
    presentationFormat,
    renderPassDescriptor,
    ['dog', 'cat'],
    [dogTexture, catTexture],
    'CRT',
    true,
  );

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
    switch (settings.shaderType) {
      case 'grid':
        {
          gridRenderer.run(commandEncoder, {
            gridDimensions: settings.gridDimensions,
            cellOriginX: settings.cellOriginX,
            cellOriginY: settings.cellOriginY,
            lineWidth: settings.pulseLine
              ? cosineInterpolate(
                  settings.lineWidth,
                  settings.pulseWidth,
                  timeElapsed - (timeElapsed / 10) * (settings.pulseSpeed + 10)
                )
              : settings.lineWidth,
          });
        }
        break;
      case 'crt': 
        {
          crtRenderer.run(commandEncoder, {
            time: timeElapsed,
            textureName: settings.textureName,
            debugStep: 1,
          });
        } 
        break;
      case 'step mix':
        {
          const passEncoder =
            commandEncoder.beginRenderPass(renderPassDescriptor);
          passEncoder.setPipeline(pipeline);
          passEncoder.setBindGroup(
            0,
            fragmentBindGroupDescriptor.bindGroups[0]
          );
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
