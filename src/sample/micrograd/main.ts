/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout/SampleLayout';
import fullscreenVertWebGLWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';

import { SampleInitFactoryCanvas2D } from '../../components/SampleLayout/SampleLayoutUtils';


const rectPoints = [
  [200, 400],
  [200, 700],
  [400, 700],
  [400, 400]
];

const drawCanvas = (
  context: CanvasRenderingContext2D, 
  zoomFactor: number
) => {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.beginPath();
  context.moveTo(rectPoints[0][0] * zoomFactor, rectPoints[0][1] * zoomFactor);
  context.lineTo(rectPoints[1][0] * zoomFactor, rectPoints[1][1] * zoomFactor);
  context.lineTo(rectPoints[2][0] * zoomFactor, rectPoints[2][1] * zoomFactor);
  context.lineTo(rectPoints[3][0] * zoomFactor, rectPoints[3][1] * zoomFactor);
  context.lineTo(rectPoints[0][0] * zoomFactor, rectPoints[0][1] * zoomFactor);
  context.stroke();
}

let init: SampleInit;
SampleInitFactoryCanvas2D(
  ({
    canvas,
    pageState,
    context,
  }) => {

    let initialDistance = 0;
    let zoomFactor = 1;
  
    canvas.addEventListener('touchstart', function(event) {
      if (event.touches.length === 2) {
        initialDistance = Math.hypot(
          event.touches[0].pageX - event.touches[1].pageX,
          event.touches[0].pageY - event.touches[1].pageY
        );
      }
    });
    
    canvas.addEventListener('touchmove', function(event) {
      if (event.touches.length === 2) {
        const currentDistance = Math.hypot(
          event.touches[0].pageX - event.touches[1].pageX,
          event.touches[0].pageY - event.touches[1].pageY
        );
    
        zoomFactor = currentDistance / initialDistance;
        initialDistance = currentDistance;
        console.log(zoomFactor);
      }
    });
    

    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;
      drawCanvas(context, zoomFactor)
  
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  [
    '(Add Explanations)'
  ],
).then((resultInit) => (init = resultInit));

const microGradExample: () => JSX.Element = () =>
  makeSample({
    name: 'MicroGrad Example',
    description: 'WIP Micrograd Example (INCOMPLETE)',
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: '../../shaders/fullscreen.vert.wgsl',
        contents: fullscreenVertWebGLWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default microGradExample;
