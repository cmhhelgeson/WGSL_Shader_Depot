/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../../components/SampleLayout/SampleLayout';
import fullscreenVertNDCFlipped from '../../../shaders/fullscreenNDCFlipped.vert.wgsl';

import { SampleInitFactoryWebGPU } from '../../../components/SampleLayout/SampleLayoutUtils';
import SDFCircleRenderer from './sdfCircle';
import { SDFCircleShader } from './shader';

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
      radius: 0.5,
      xOffset: 0.0,
      yOffset: 0.0,
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
  
    gui.add(settings, 'radius', 0.1, 1.0).step(0.1);
    gui.add(settings, 'xOffset', -1.0, 1.0).step(0.1);
    gui.add(settings, 'yOffset', -1.0, 1.0).step(0.1);
  
    const sdfCircleRenderer = new SDFCircleRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['default'],
      'SDFCircle',
    );
  
    const sdfCircleDebugRenderer = new SDFCircleRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['default'],
      'SDFCircle',
      true
    )
  
    let lastTime = performance.now();
    let timeElapsed = 0;
  
    function frame() {
      if (!pageState.active) return;

      const currentTime = performance.now();
      timeElapsed += Math.min(1 / 60, (currentTime - lastTime) / 1000);
      lastTime = currentTime;
  
      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();
  
      const commandEncoder = device.createCommandEncoder();
      if (debugOnRef.current) {
        sdfCircleDebugRenderer.startRun(commandEncoder, {
          debugStep: debugValueRef.current,
          ...settings
        });
      } else {
        sdfCircleRenderer.startRun(commandEncoder, {
          debugStep: debugValueRef.current,
          ...settings,
        });
      }
  
      device.queue.submit([commandEncoder.finish()]);
  
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  ['Add Explanations'],
).then((resultInit) => (init = resultInit));

//Effectively the equivalent of returning <SampleLayout>
const complexCRTExample: () => JSX.Element = () =>
  makeSample({
    name: 'SDF Circle Shader',
    description: 'Simple shader rendering an SDF circle',
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
        name: './sdfCircle.frag.wgsl',
        contents: SDFCircleShader(false),
        editable: true,
      },
    ],
    filename: __filename,
  });
export default complexCRTExample;