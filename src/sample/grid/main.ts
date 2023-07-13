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

const init: SampleInit = async ({ canvas, pageState, gui, debugValueRef}) => {
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
    gridDimensions: 10.0,
    cellOriginX: 0.0,
    cellOriginY: 0.0,
    cellOrigin: 0.0,
    lineWidth: 1.0,
    pulseWidth: 2.0,
    pulseLine: true,
    pulseSpeed: 0,
  };


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


  gui.add(settings, 'gridDimensions', 1.0, 100.0).step(1.0);
  const cellOriginX = gui.add(settings, 'cellOriginX', -1.0, 1.0).step(0.1);
  const cellOriginY = gui.add(settings, 'cellOriginY', -1.0, 1.0).step(0.1);
  gui
    .add(settings, 'cellOrigin', -1.0, 1.0)
    .step(0.1)
    .onChange(changeCellOriginUniform);
  gui.add(settings, 'lineWidth', 1.0, 8.0).step(0.1);
  gui.add(settings, 'pulseWidth', 2.0, 9.0).step(0.1);
  gui.add(settings, 'pulseLine');
  gui.add(settings, 'pulseSpeed', 0, 100).step(10);

  const gridRenderer = new GridRenderer(
    device,
    presentationFormat,
    renderPassDescriptor
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
            debugStep: debugValueRef.current,
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
