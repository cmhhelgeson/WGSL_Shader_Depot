/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import fullscreenVertWebGLWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';
import gridFragWGSL from './grid.frag.wgsl';

import GridRenderer from './grid';
import { cosineInterpolate } from '../../utils/interpolate';

const init: SampleInit = async ({ canvas, pageState, gui, debugValueRef, debugOnRef, canvasRef}) => {
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
    pulseSpeed: 10,
    hoveredCell: '0, 0',
    resetValues: () => { return; }
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

  const changeCellOriginUniform = () => {
    cellOriginXPad.setValue(settings.cellOrigin);
    //settings.cellOriginY = settings.cellOrigin;
    cellOriginYPad.setValue(settings.cellOrigin);
  };


  const gridDimPad = gui.add(settings, 'gridDimensions', 1.0, 100.0).step(1.0);
  const cellOriginXPad = gui.add(settings, 'cellOriginX', -1.0, 1.0).step(0.1);
  const cellOriginYPad = gui.add(settings, 'cellOriginY', -1.0, 1.0).step(0.1);
  const cellOriginPad = gui
    .add(settings, 'cellOrigin', -1.0, 1.0)
    .step(0.1)
    .onChange(changeCellOriginUniform);
  const lineWidthPad = gui.add(settings, 'lineWidth', 1.0, 8.0).step(0.1);
  const pulseWidthPad = gui.add(settings, 'pulseWidth', 2.0, 9.0).step(0.1);
  const pulseSpeedPad =  gui.add(settings, 'pulseSpeed', 0, 100).step(10);
  const isPulsePad = gui.add(settings, 'pulseLine');
  const resetValues = () => {
    gridDimPad.setValue(10.0);
    cellOriginXPad.setValue(0.0);
    cellOriginYPad.setValue(0.0);
    cellOriginPad.setValue(0.0);
    lineWidthPad.setValue(1);
    pulseWidthPad.setValue(2);
    pulseSpeedPad.setValue(10);
    isPulsePad.setValue(true);
  }
  gui.add(settings, 'resetValues').onChange(resetValues);
  const hoveredCell = gui.add(settings, 'hoveredCell')
  hoveredCell.domElement.style.pointerEvents = "none";

  const gridRenderer = new GridRenderer(
    device,
    presentationFormat,
    renderPassDescriptor,
    ["grid"],
    "Grid",
  );

  const gridRendererDebug = new GridRenderer(
    device,
    presentationFormat,
    renderPassDescriptor,
    ["grid"],
    "Grid",
    true
  );

  let lastTime = performance.now();
  let timeElapsed = 0;

  canvas.addEventListener('mousemove', (event) => {
    const currWidth = canvasRef.current.getBoundingClientRect().width;
    const currHeight = canvasRef.current.getBoundingClientRect().height;
    const cellSize: [number, number] = [currWidth / settings.gridDimensions, currHeight / settings.gridDimensions]
    const xIndex = Math.floor(event.offsetX / cellSize[0]);
    const yIndex = Math.floor(event.offsetY / cellSize[1])
    hoveredCell.setValue(`${xIndex}, ${yIndex}`);
  })
  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;
    const currentTime = performance.now();

    timeElapsed += Math.min(1 / 60, (currentTime - lastTime) / 1000);

    lastTime = currentTime;


    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    if (debugOnRef.current) {
      gridRendererDebug.startRun(commandEncoder, {
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
        debugStep: debugValueRef.current,
      });
    } else {
      gridRenderer.startRun(commandEncoder, {
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
        debugStep: debugValueRef.current,
        });
    }

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return [
    "Set fragments to texture uvs (red as x goes right to 1, green as y goes up to 1).", 
    "Multiply the UVs by the Grid Dimensions, creating a small cell in the lower left side of the screen. Values beyond 1 become yellow",
    "Repeat the cells across the screen by outputing the fractional component of the operation above",
    "Shift the origin of each cell (the black area where both x and y are 0) by 0.5 + cellOrigin",
    "Output the scaled distance away from the center of the cell (note how cell origin is white)",
    "Interpolate the output for values between 0.0 and 0.05 (0.0 returns 0, 0.025 returns 0.5, 0.05 returns 1)",
  ];
};

const gridExample: () => JSX.Element = () =>
  makeSample({
    name: 'Grid Shader',
    description: 'A shader that renders a basic, graph style grid.',
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
      {
        name: './fullscreen.frag.wgsl',
        contents: gridFragWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default gridExample;
