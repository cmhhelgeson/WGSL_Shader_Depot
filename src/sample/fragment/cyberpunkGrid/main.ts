import {
  makeSample,
  SampleInit,
} from '../../../components/SampleLayout/SampleLayout';
import CyberpunkGridRenderer from './cyberpunkGrid';
import { SampleInitFactoryWebGPU } from '../../../components/SampleLayout/SampleLayoutUtils';
import { CyberpunkGridShader } from './shader';
import CyberpunkGridCommonsWGSL from './cyberpunk_commons.wgsl';
import { CyberpunkGridExplanations } from './shader';

let init: SampleInit;

SampleInitFactoryWebGPU(
  ({
    pageState,
    gui,
    debugValueRef,
    debugOnRef,
    canvasRef,
    device,
    context,
    presentationFormat,
  }) => {
    const settings = {
      lineSize: 0.2,
      lineGlow: 0.01,
      fog: 0.2,
      sunX: -0.75,
      sunY: 0.2,
      gridLineSpeed: 1.0,
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

    gui.add(settings, 'lineSize', 0.1, 1.0).step(0.1);
    gui.add(settings, 'lineGlow', 0.001, 0.1).step(0.001);
    gui.add(settings, 'fog', 0.1, 1.0).step(0.1);
    gui.add(settings, 'sunX', -1.0, 1.0).step(0.01);
    gui.add(settings, 'sunY', 0.0, 1.0).step(0.01);
    gui.add(settings, 'gridLineSpeed', 0.0, 3.0).step(0.1);

    const renderer = new CyberpunkGridRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['grid'],
      'CyberpunkGrid'
    );

    const debugRenderer = new CyberpunkGridRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['grid'],
      'CyberpunkGrid',
      true
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
      if (debugOnRef.current) {
        debugRenderer.startRun(commandEncoder, {
          gridLineR: 1.0,
          gridLineG: 0.0,
          gridLineB: 0.0,
          time: timeElapsed,
          canvasWidth: canvasRef.current.width * devicePixelRatio,
          canvasHeight: canvasRef.current.height * devicePixelRatio,
          debugStep: debugValueRef.current,
          lineSize: settings.lineSize,
          lineGlow: settings.lineGlow,
          fog: settings.fog,
          sunX: settings.sunX,
          sunY: settings.sunY,
          gridLineSpeed: settings.gridLineSpeed,
        });
      } else {
        renderer.startRun(commandEncoder, {
          gridLineR: 1.0,
          gridLineG: 1.0,
          gridLineB: 1.0,
          time: timeElapsed,
          debugStep: debugValueRef.current,
          canvasWidth: canvasRef.current.width * devicePixelRatio,
          canvasHeight: canvasRef.current.height * devicePixelRatio,
          lineSize: settings.lineSize,
          lineGlow: settings.lineGlow,
          fog: settings.fog,
          sunX: -settings.sunX,
          sunY: settings.sunY,
          gridLineSpeed: settings.gridLineSpeed,
        });
      }

      device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  CyberpunkGridExplanations
).then((resultInit) => (init = resultInit));

const cyberpunkGridExample: () => JSX.Element = () =>
  makeSample({
    name: 'Cyberpunk Grid Shader',
    description: 'A shader that renders a 80s, cyberpunk style grid.',
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './cyberpunkGrid.frag.wgsl',
        contents: CyberpunkGridShader(false),
        editable: true,
      },
      {
        name: './cyberpunkGridDebug.frag.wgsl',
        contents: CyberpunkGridShader(true),
        editable: true,
      },
      {
        name: './cyberpunk_commons.wgsl',
        contents: CyberpunkGridCommonsWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default cyberpunkGridExample;
