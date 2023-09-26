/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout/SampleLayout';
import fullscreenVertWebGLWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';
import { doRectsOverlap, Rect } from './rect';

import { SampleInitFactoryCanvas2D } from '../../components/SampleLayout/SampleLayoutUtils';

const drawPanAndZoom = (
  context: CanvasRenderingContext2D,
  cameraZoom: number,
  cameraOffset: {x: number, y: number},
  screenRect: Rect,
  objectArr: RandomSquare[],
) => {
  context.save();
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.scale(cameraZoom, cameraZoom);
  context.translate(cameraOffset.x, cameraOffset.y);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  for (let i = 0; i < objectArr.length; i++) {
    if (doRectsOverlap(screenRect, objectArr[i])) {
      const obj = objectArr[i];
      context.fillStyle = `rgba(${obj.color.r}, ${obj.color.g}, ${obj.color.b}, 1.0)`
      context.fillRect(obj.pos.x, obj.pos.y, obj.size.x, obj.size.y);
    }
  }
  context.fillStyle = "blue"
  context.fillRect(0, 0, 100, 20)
  context.restore();
}

interface RandomSquare extends Rect {
  color: {r: number, g: number, b: number};
}

class StaticQuadTree {
  rect: Rect;
  childAreas: [Rect, Rect, Rect, Rect];
  childTrees: [
    StaticQuadTree | null,
    StaticQuadTree | null,
    StaticQuadTree | null,
    StaticQuadTree | null,
  ];
  items: [Rect, RandomSquare][];
  depth: number;

  constructor(rect: Rect = 
    {
      pos: {x: 0, y: 0},
      size: {x: 100, y: 100}
    },
    depth = 0
  ) {
    this.depth = depth;
    this.rect = rect;
    this.resize(rect);
  };

  resize(area: Rect) {
    this.rect = area;
    const childSize = {x: this.rect.size.x / 2.0, y: this.rect.size.y / 2.0};
    this.childTrees = [
      new StaticQuadTree({
        pos: area.pos, size: childSize
      }),
      new StaticQuadTree({
        pos: {x: area.pos.x + childSize.x, y: area.pos.y },
        size: childSize,
      }),
      new StaticQuadTree({
        pos: {x: area.pos.x, y: area.pos.y + childSize.y},
        size: childSize,
      }),
      new StaticQuadTree({
        pos: {x: area.pos.x + childSize.x, y: area.pos.y + childSize.y},
        size: childSize
      })
    ]
  }

  clear() {
    this.items = [];
    this.childTrees = [null, null, null, null];
  }

  search(area: Rect, listItems: RandomSquare[]) {
    for (const p of this.items) {
      if (doRectsOverlap(area, p[0])) {
        listItems.push(p[1]);
      }
    }
    for (let i = 0; i < 4; i++) {
      
    }
  }
}



let init: SampleInit;
SampleInitFactoryCanvas2D(
  ({
    canvas,
    pageState,
    context,
    gui,
  }) => {

    let isDragging = false;
    const dragStart = { x: 0, y: 0 };
    let cameraZoom = 1;
    let lastZoom = 1;
    const cameraOffset = {x: 0, y: 0};
    let initialPinchDistance = null;
    const screenRect = {
      //Upper left corner of screen
      pos: {x: 0, y: 0},
      size: {x: canvas.width, y: canvas.height}
    };

    const settings = {
      'Depth Limit': 4,
      'Quad Tree Size': 100,
    }

    const simpleRand = (a: number, b: number): number => {
      return Math.random() * (b - a) + a;
    }

    const objectArr: RandomSquare[] = [];
    for (let i = 0; i < 1000; i++) {
      objectArr.push({
        pos: {x: simpleRand(0.0, 5000.0), y: simpleRand(0.0, 5000.0)},
        size: {x: simpleRand(0.1, 100.0), y: simpleRand(0.0, 100.0)},
        color: {
          r: Math.floor(Math.random() * 256),
          g: Math.floor(Math.random() * 256),
          b: Math.floor(Math.random() * 256),
        }
      })
    }

    const onPointerDown = (e: MouseEvent | Touch) => {
      isDragging = true;
      dragStart.x = e.clientX / cameraZoom - cameraOffset.x;
      dragStart.y = e.clientY / cameraZoom - cameraOffset.y;
      canvas.focus();
    }

    const onPointerUp = (e: MouseEvent | Touch) => {
      isDragging = false;
      initialPinchDistance = null;
      lastZoom = cameraZoom;
    }

    const onPointerMove = (e: MouseEvent | Touch) => {
      if (isDragging) {
        cameraOffset.x = e.clientX / cameraZoom - dragStart.x;
        cameraOffset.y = e.clientY / cameraZoom - dragStart.y;
        //TODO: Make sure this is correct, should be since translation corresponds with rect positions
        screenRect.pos.x = -cameraOffset.x;
        screenRect.pos.y = -cameraOffset.y;
      }
    }

    const adjustZoom = (zoomAmount?: number, zoomFactor?: number) => {
      if (!isDragging) {
        if (zoomAmount) {
          cameraZoom += zoomAmount;
        }
        else if (zoomFactor) {
          cameraZoom = zoomFactor * lastZoom;
        }

        //Clamp zoom min
        cameraZoom = Math.min(cameraZoom, 5)
        //Clamp zoom max
        cameraZoom = Math.max(cameraZoom, 0.1);
        
        screenRect.size.x = canvas.width / cameraZoom;
        screenRect.size.y = canvas.height / cameraZoom;
        console.log(screenRect.size.x);

        console.log(cameraZoom);
      }
    }

    const handlePinch = (e: TouchEvent) => {
      e.preventDefault();

      const firstPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY};
      const secondPoint = { x: e.touches[1].clientX, y: e.touches[1].clientY};

      //distance square
      const currentDistance = (firstPoint.x - secondPoint.x)**2 + (firstPoint.x - secondPoint.y)**2;
      if (initialPinchDistance = null) {
        initialPinchDistance = currentDistance;
      } else {
        adjustZoom(null, currentDistance / initialPinchDistance);
      }
    }

    const handleTouch = (
      e: TouchEvent,
      pointHandler: (e: MouseEvent | Touch) => void,
    ) => {
      if (e.touches.length === 1) {
        pointHandler(e.touches[0]);
      } else if (e.type == 'touchmove' && e.touches.length === 2) {
        console.log('test')
        isDragging = false;
        handlePinch(e);
      }
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('touchstart', (e) => handleTouch(e, onPointerDown))
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchend',  (e) => handleTouch(e, onPointerUp))
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('touchmove', (e) => handleTouch(e, onPointerMove))
    canvas.addEventListener( 'wheel', (e) => adjustZoom(e.deltaY*0.0005));


    gui.add(settings, 'Depth Limit', 2, 10).step(1);
    gui.add(settings, 'Quad Tree Size');

    
    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;

      drawPanAndZoom(context, cameraZoom, cameraOffset, screenRect, objectArr);
  
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
    coordinateSystem: 'Canvas2D',
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
