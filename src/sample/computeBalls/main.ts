/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout/SampleLayout';
import { SampleInitFactoryCanvas2D } from '../../components/SampleLayout/SampleLayoutUtils';
import BallsComputeWGSL from './balls.comp.wgsl';


let init: SampleInit;
SampleInitFactoryCanvas2D(
  ({
    pageState,
    gui,
    device,
  }) => {
    
    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;
      const currentTime = performance.now();
  
  
      lastTime = currentTime;

  
      const commandEncoder = device.createCommandEncoder();
  
      device.queue.submit([commandEncoder.finish()]);
  
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

  },
  [

  ]
).then((resultInit) => (init = resultInit));

const computeBallsExample: () => JSX.Element = () =>
  makeSample({
    name: 'Surma Balls',
    description: 'A compute shader which performs basic position and velocity calculations on a series of ball objects.',
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './balls.compute.wgsl',
        contents: BallsComputeWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default computeBallsExample;