/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout/SampleLayout';
import fullscreenVertNDCFlipped from '../../shaders/fullscreenNDCFlipped.vert.wgsl';

import ComplexCRTRenderer from './complexCRT';
import { createTextureFromImage } from '../../utils/texture';
import { SampleInitFactoryWebGPU } from '../../components/SampleLayout/SampleLayoutUtils';
import { ComplexCRTExplanations, ComplexCRTShader } from './shader';

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({
    pageState,
    gui,
    debugValueRef,
    debugOnRef,
    device,
    context,
    canvas,
    canvasRef,
    presentationFormat,
  }) => {
    const settings = {
      textureName: 'dog',
      cellSize: 12.0,
      cellOffset: 0.5,
      borderMask: 1.0,
      screenCurvature: 0.08,
      zoom: 1.0,
    };
  
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
  
    gui.add(settings, 'textureName', ['dog', 'cat', 'pukh'])
    gui.add(settings, 'cellSize', 0.1, 50.0).step(1.0);
    gui.add(settings, 'cellOffset', 0.0, 1.0).step(0.1);
    gui.add(settings, 'borderMask', 0.0, 5.0).step(0.1);
    gui.add(settings, 'screenCurvature', 0.00, 0.50).step(0.01);
    gui.add(settings, 'zoom', 0.0, 1.0).step(0.1);

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

    let pukhTexture: GPUTexture;
    {
      const response = await fetch(new URL('../../../assets/img/pukh.png', import.meta.url).toString());
      const bitmap = await createImageBitmap(await response.blob());
      pukhTexture = createTextureFromImage(device, bitmap);
    }
  
    const crtRenderer = new ComplexCRTRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['dog', 'cat', 'pukh'],
      [dogTexture, catTexture, pukhTexture],
      'CRT',
    );
  
    const crtDebugRenderer = new ComplexCRTRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['dog', 'cat', 'pukh'],
      [dogTexture, catTexture, pukhTexture],
      'CRT',
      true
    )
  
    let lastTime = performance.now();
    let timeElapsed = 0;
  
    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;
      const currentTime = performance.now();
  
      timeElapsed += Math.min(1 / 60, (currentTime - lastTime) / 1000);
  
      //const dtArr = new Float32Array([timeElapsed]);
  
      lastTime = currentTime;
  
      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();
  
      const commandEncoder = device.createCommandEncoder();
      if (debugOnRef.current) {
        //@ts-ignore
        crtDebugRenderer.startRun(commandEncoder, {
          time: timeElapsed,
          textureName: settings.textureName,
          debugStep: debugValueRef.current,
          cellSize: settings.cellSize,
          cellOffset: settings.cellOffset,
          borderMask: settings.borderMask,
          canvasWidth: canvasRef.current ? canvasRef.current.width : canvas.width,
          canvasHeight: canvasRef.current ? canvasRef.current.height : canvas.height,
          screenCurvature: settings.screenCurvature,
          zoom: settings.zoom,
        });
      } else {
        //@ts-ignore
        crtRenderer.startRun(commandEncoder, {
          time: timeElapsed,
          textureName: settings.textureName,
          debugStep: debugValueRef.current,
          cellSize: settings.cellSize,
          cellOffset: settings.cellOffset,
          borderMask: settings.borderMask,
          canvasWidth: canvasRef.current ? canvasRef.current.width : canvas.width,
          canvasHeight: canvasRef.current ? canvasRef.current.height : canvas.height,
          screenCurvature: settings.screenCurvature,
          zoom: settings.zoom,
        });
      }
  
      device.queue.submit([commandEncoder.finish()]);
  
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  ComplexCRTExplanations,
).then((resultInit) => (init = resultInit));

//Effectively the equivalent of returning <SampleLayout>
const complexCRTExample: () => JSX.Element = () =>
  makeSample({
    name: 'Complex CRT Shader',
    description: 'A more accurate CRT Shader simulating the phosphor cells of the display.',
    init,
    coordinateSystem: 'NDCFlipped',
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: '../../shaders/fullscreenNDCFlipped.vert.wgsl',
        contents: fullscreenVertNDCFlipped,
        editable: true,
      },
      {
        name: './complexCRT.frag.wgsl',
        contents: ComplexCRTShader(false),
        editable: true,
      },
    ],
    filename: __filename,
  });
export default complexCRTExample;