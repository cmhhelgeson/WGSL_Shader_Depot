/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import CyberpunkGridRenderer from './cyberpunkGrid';
import CyberpunkGridFragWGSL from './cyberpunk.frag.wgsl';


const init: SampleInit = async ({ canvas, pageState, debugValueRef, debugOnRef, canvasRef}) => {
  //Normal setup
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  console.log(canvas.clientWidth * devicePixelRatio);
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });
  
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

  const renderer = new CyberpunkGridRenderer(
    device,
    presentationFormat,
    renderPassDescriptor,
    ["grid"],
    "CyberpunkGrid",
  );

  const debugRenderer = new CyberpunkGridRenderer(
    device,
    presentationFormat,
    renderPassDescriptor,
    ["grid"],
    "CyberpunkGrid",
    true,
  );


  let lastTime = performance.now();
  let timeElapsed = 0;

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
    console.log(canvasRef.current.width)
    if (debugOnRef.current) {
      debugRenderer.startRun(commandEncoder, {
        time: timeElapsed,
        canvasWidth: canvasRef.current.width * devicePixelRatio,
        canvasHeight: canvasRef.current.height * devicePixelRatio,
        debugStep: debugValueRef.current
      });
    } else {
      renderer.startRun(commandEncoder, {
        time: timeElapsed,
        debugStep: debugValueRef.current,
        canvasWidth: canvasRef.current.width * devicePixelRatio,
        canvasHeight: canvasRef.current.height * devicePixelRatio,
      });
    }

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return [
    "Set fragments to texture uvs (red as x goes right to 1, green as y goes up to 1).", 
  ];
};

const cyberpunkGridExample: () => JSX.Element = () =>
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
        name: './fullscreen.frag.wgsl',
        contents: CyberpunkGridFragWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default cyberpunkGridExample;