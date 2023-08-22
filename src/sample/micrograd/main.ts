/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout/SampleLayout';
import fullscreenVertWebGLWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';

import { SampleInitFactoryCanvas2D } from '../../components/SampleLayout/SampleLayoutUtils';
import { vec2 } from 'wgpu-matrix';
import { instance} from '@viz-js/viz';
import { completeBackwards, createMVGGraph, MGVAdd, MGVMultiply, MGVTanh, MVGCreate, topoMVG } from './micrograd';


const rectPoints: [number, number][] = [
  [20, 40],
  [20, 70],
  [40, 70],
  [40, 40]
];

const drawCanvas = (
  context: CanvasRenderingContext2D,
  zoomFactor: [number, number],
  offset: [number, number],
) => {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.strokeStyle = "blue"
  context.lineWidth = 2;
  context.beginPath();
  const p1 = vec2.add(
    vec2.mul(rectPoints[0], zoomFactor), 
    offset
  );
  const p2 = vec2.add(
    vec2.mul(rectPoints[1], zoomFactor), 
    offset
  );
  const p3 = vec2.add(
    vec2.mul(rectPoints[2], zoomFactor), 
    offset
  );
  const p4 = vec2.add(
    vec2.mul(rectPoints[3], zoomFactor), 
    offset
  );
  context.moveTo(p1[0], p1[1]);
  context.lineTo(p2[0], p2[1]);
  context.lineTo(p3[0], p3[1]);
  context.lineTo(p4[0], p4[1]);
  context.lineTo(p1[0], p1[1]);
  context.stroke();

}

let init: SampleInit;
SampleInitFactoryCanvas2D(
  ({
    canvas,
    pageState,
    context,
  }) => {

    /*const a = MVGCreate({data: 2.0, label: 'a'});
    const b = MVGCreate({data: 3.0, label: 'b'});
    const c = MVGCreate({data: 10.0, label: 'c'});

    const e = MGVMultiply(a, b, 'e');
    e.label = 'e';

    const d = MGVAdd(e, c, 'd');
    d.label = 'd';
    const f = MVGCreate({data: -2.0, label: 'f'});

    const L = MGVMultiply(d, f, 'L');
    L.gradient = 1.0;

    L.backwards();
    d.backwards();
    e.backwards();

    const digraph = createMVGGraph(L, 'CMH', 0.1, 'LR', 'black', 'white');
    console.log("Digraph debug")
    console.log(digraph) */

    const x1 = MVGCreate({data: 2.0, label: "x1"});
    const x2 = MVGCreate({data: 0.0, label: 'x2'});

    const w1 = MVGCreate({data: -3.0, label: 'w1'});
    const w2 = MVGCreate({data: 1.0, label: 'w2'});

    const b = MVGCreate({data: 6.8813735870195432, label: 'b'});

    const x1w1 = MGVMultiply(x1, w1, 'x1w1');
    const x2w2 = MGVMultiply(x2, w2, 'x2w2');

    const x1w1x2w2 = MGVAdd(x1w1, x2w2, 'x1w1x2w2');

    const n = MGVAdd(x1w1x2w2, b, 'n');
    const o = MGVTanh(n, 'o');
    o.gradient = 1.0;

    completeBackwards(o);

    const digraph = createMVGGraph(o, 'CMH', 0.5, 'LR', 'black', 'white');

    instance().then(viz => {
      const svgContainer = document.createElement('div');
      svgContainer.id = 'MICROGRAD_SVG_CONTAINER';
      document.getElementById('WGSL_CANVAS_CONTAINER').appendChild(svgContainer);
      document.getElementById('MICROGRAD_SVG_CONTAINER').appendChild(viz.renderSVGElement(digraph));
      const parentElement = document.getElementById('MICROGRAD_SVG_CONTAINER')
      parentElement.style.overflowX = 'scroll';
      parentElement.children[0].setAttribute('style', 'overflow-x: scroll;');
    });

    let initialDistance = 0;
    let zoomFactor = 1;

    let startOffsetting = false;
    let offset = vec2.create(0, 0);

    let touchInit = vec2.create(0, 0);
    const zoomScale = vec2.create(1, 1)
  
    canvas.addEventListener('mousedown', function(event) {
      startOffsetting = true;
      touchInit = [event.pageX, event.pageY];
      console.log(touchInit);
    });
    
    window.addEventListener('mousemove', function(event) {
      if (startOffsetting) {
        offset[0] = event.pageX - touchInit[0];
        offset[1] = event.pageY - touchInit[1];
      }
    });

    window.addEventListener('mouseup', function(event) {
      console.log(offset);
      startOffsetting = false;
    });

    window.addEventListener('keydown', function(event) {
      console.log('test')
      switch(event.key) {
        case '=': {
          zoomScale[0] *= 1.01
          zoomScale[1] *= 1.01
        } break;
        case '-': {
          zoomScale[0] *= 0.9
          zoomScale[1] *= 0.9
        } break;
      }
    })
    

    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;
      context.fillStyle = "blue"

      drawCanvas(context, zoomScale, offset);
  
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

//var<storage, read_write> input
//var<storage,read_write> training_labels = [1, -1, -1, 1]
