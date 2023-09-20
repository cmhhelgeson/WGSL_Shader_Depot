/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../../components/SampleLayout/SampleLayout';
import fullscreenVertWebGPU from '../../../shaders/fullscreenWebGPU.vert.wgsl';
import crtFragShader from './crt.frag.wgsl';

import CRTRenderer from './crt';
import { createTextureFromImage } from '../../../utils/texture';
import { SampleInitFactoryWebGPU } from '../../../components/SampleLayout/SampleLayoutUtils';

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({
    pageState,
    gui,
    debugValueRef,
    debugOnRef,
    device,
    context,
    presentationFormat,
  }) => {
    const settings = {
      shaderType: 'crt',
      textureName: 'dog',
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
  
  
    gui.add(settings, 'textureName', ['dog', 'cat'])
  
    let dogTexture: GPUTexture 
    {
      const response = await fetch(new URL('../../../../assets/img/dog.jpg', import.meta.url).toString());
      const bitmap = await createImageBitmap(await response.blob());
      dogTexture = createTextureFromImage(device, bitmap)
    }
    let catTexture: GPUTexture;
    {
      const response = await fetch(new URL('../../../../assets/img/cat.jpg', import.meta.url).toString());
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
    );
  
    const crtDebugRenderer = new CRTRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['dog', 'cat'],
      [dogTexture, catTexture],
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
        // @ts-ignore
        crtDebugRenderer.startRun(commandEncoder, {
          time: timeElapsed,
          textureName: settings.textureName,
          debugStep: debugValueRef.current,
        });
      } else {
        // @ts-ignore
        crtRenderer.startRun(commandEncoder, {
          time: timeElapsed,
          textureName: settings.textureName,
          debugStep: debugValueRef.current,
        });
      }
  
      device.queue.submit([commandEncoder.finish()]);
  
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  [
    'Set output to the sin of input.uv.y.',
    'Scale input.uv.y to create an alternating pattern.',
    'Offset the alternating pattern by the time elapsed.',
    'Perform the prior operations again, only scale by a different factor and offset in the negative direction.',
    'Remap the values of your alternating pattern to exist within a range of 0.9 to 1.',
    'Return the sampled texture mixed with your two alternating patterns.'
  ],
).then((resultInit) => (init = resultInit));

//Effectively the equivalent of returning <SampleLayout>
const crtExample: () => JSX.Element = () =>
  makeSample({
    name: 'CRT Shader',
    description: 'A basic shader emulating a CRT-style effect',
    init,
    coordinateSystem: 'WEBGPU',
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      CRTRenderer.sourceInfo,
      {
        name: '../../shaders/fullscreenWebGPU.vert.wgsl',
        contents: fullscreenVertWebGPU,
        editable: true,
      },
      {
        name: './crt.frag.wgsl',
        contents: crtFragShader,
        editable: true,
      },
    ],
    filename: __filename,
  });
export default crtExample;
