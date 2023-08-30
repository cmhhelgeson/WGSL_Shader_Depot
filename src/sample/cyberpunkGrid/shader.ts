import {
  createDebugValuePackage,
  DebugValuePackage,
  createAssignmentStatement,
  createWGSLUniform,
} from '../../utils/shaderUtils';

export const CyberpunkGridExplanations = [
  'Move your uvs into a range of -1 to 1.',
  'Invert uv.y',
  'Select uvs below the horizon line at uv.y = -0.2',
  'The output displayed above represents the function: 3.0 / (abs(uv.y + 0.2) + 0.05);',
  'Accordingly, new uvs below the horizon are large at the horizon, then taper downward',
  'Define the general size of a single grid line, as determined by lineSize and lineGlow',
  'The falloff increases as lineGlow increases.',
  'Scale initial line by time',
  'Get fractional component of time offset line',
  'Smoothstep previous calculation to only get values within range of the line',
  '(Add Explanation)',
  '(Add Explanation)',
  'Moving above the line...',
  '...we adjust our uv.y (represented by increasing green values) above the horizon line...',
  '...offseting them from a -0.2 to 1 range into a -0.79 to 0.41 range.',
  'We then apply additional offsets to our uvs that indicate the bounds of our sun object',
  'Final Output',
];

export const argKeys = [
  'gridLineR',
  'gridLineG',
  'gridLineB',
  'time',
  'canvasWidth',
  'canvasHeight',
  'debugStep',
  'fog',
  'lineSize',
  'lineGlow',
  'sunX',
  'sunY',
  'gridLineSpeed',
];

//TODO: Whole debugPackage idea needs to be reworked. Everything just needs to be done inline.
//Abstraction is unecessary

//Maybe this function should return an object that contains both the code and the debug instructions
export const CyberpunkGridShader = (debug: boolean) => {
  const debugPackages: DebugValuePackage[] = [];
  let debugVariableDeclarations = '';
  let debugReturnStatements = '';
  if (debug) {
    debugPackages.push(createDebugValuePackage(0, 2, 'uvRangeUv'));
    debugPackages.push(createDebugValuePackage(1, 2, 'invertRangeUv'));
    debugPackages.push(
      createDebugValuePackage([2, 3, 4], 2, 'underHorizonSelectUv')
    );
    debugPackages.push(createDebugValuePackage([5, 6], 2, 'lineSizeDefineUv'));
    debugPackages.push(createDebugValuePackage(7, 2, 'stepFiveUv'));
    debugPackages.push(createDebugValuePackage(8, 2, 'stepSixUv'));
    debugPackages.push(createDebugValuePackage(9, 2, 'stepSevenUv'));
    debugPackages.push(createDebugValuePackage(10, 2, 'stepEightUv'));
    debugPackages.push(createDebugValuePackage(11, 2, 'clampLineUv'));
    debugPackages.push(createDebugValuePackage(12, 2, 'aboveHorizonSelectUv'));
    debugPackages.push(
      createDebugValuePackage([13, 14], 2, 'offsetAboveHorizonUv')
    );
    debugPackages.push(createDebugValuePackage(15, 2, 'sunDebugUv'));
    for (let i = 0; i < debugPackages.length; i++) {
      debugVariableDeclarations += debugPackages[i].variableDeclaration + '\n';
      debugReturnStatements += debugPackages[i].returnStatement + '\n';
    }
  }

  return `

  ${createWGSLUniform('Uniforms', argKeys)}

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    //var uv: vec2<f32> = -(input.v_uv * 2.0 - 1.0) * vec2<f32>(-1.0, -1.0);
    var uv = (input.Position.xy * 2.0 - vec2<f32>(uniforms.canvasWidth, uniforms.canvasHeight) + vec2<f32>(-35.0, -35.0)) / uniforms.canvasHeight;
    ${debugVariableDeclarations}
    ${debug ? createAssignmentStatement(debugPackages[0], 'uv') : ``}
    uv.y = -uv.y;
    ${debug ? createAssignmentStatement(debugPackages[1], 'uv') : ``}
    var battery: f32 = 1.0;
    var fog: f32 = smoothstep(uniforms.fog, -0.02, abs(uv.y + 0.2));
    var color: vec3<f32> = vec3(0.0, 0.1, 0.2);
    var gridVal: f32 = 0.0;
    var val = 0.0;

    if (uv.y < -0.2) {
      uv.x = 1.0;
      uv.y = 3.0 / (abs(uv.y + 0.2) + 0.05);
      ${debug ? createAssignmentStatement(debugPackages[2], 'uv / 20') : ``}
      gridVal = grid(uv, battery, uniforms.time, uniforms.lineSize, uniforms.lineGlow, uniforms.gridLineSpeed);
      //As uv.y gets closer to -0.2, y will get closer to one
      ${
        debug
          ? createAssignmentStatement(
              debugPackages[3],
              'vec2(uv.y, uv.y * uv.y * uniforms.lineSize) * uniforms.lineGlow'
            )
          : ``
      }
      ${
        debug
          ? createAssignmentStatement(
              debugPackages[4],
              'lineSizeDefineUv + vec2<f32>(0.0, uniforms.time * 4.0 * (uniforms.gridLineSpeed + 0.05))'
            )
          : ``
      }
      ${
        debug
          ? createAssignmentStatement(
              debugPackages[5],
              'abs(fract(stepFiveUv) - 0.5)'
            )
          : ``
      }
      ${
        debug
          ? createAssignmentStatement(
              debugPackages[6],
              'smoothstep(lineSizeDefineUv, vec2<f32>(0.0), stepSixUv)'
            )
          : ``
      }
      ${
        debug
          ? createAssignmentStatement(
              debugPackages[7],
              'smoothstep(lineSizeDefineUv * 5.0, vec2<f32>(0.0), stepSixUv) * 0.4 * battery'
            )
          : ``
      }
      ${
        debug
          ? 'clampLineUv = vec2<f32>(0.0, clamp(stepEightUv.x + stepEightUv.y, 0.0, 3.0));'
          : ``
      }
      color = mix(color, vec3(1.0, 0.5, 1.0), gridVal);
    } else {
      ${debug ? createAssignmentStatement(debugPackages[9], 'uv') : ``}
      var fujiD: f32 = min(uv.y * 4.5 - 0.5, 1.0);
      uv.y -= 1.0 * 1.1 - 0.51;
      ${debug ? createAssignmentStatement(debugPackages[10], 'uv') : ``}

      var sunUV: vec2<f32> = uv;
      var fujiUV: vec2<f32> = uv;

      // Sun
      sunUV += vec2(uniforms.sunX, uniforms.sunY);
      ${debug ? createAssignmentStatement(debugPackages[11], 'sunUV') : ``}
      //uv.y -= 1.1 - 0.51;
      color = vec3(1.0, 0.2, 1.0);
      var sunVal = sun(sunUV, battery, uniforms.time);

      color = mix(color, vec3(1.0, 0.4, 0.1), sunUV.y * 2.0 + 0.2);
      color = mix(vec3(0.0, 0.0, 0.0), color, sunVal);


      // cloud
      var cloudUV: vec2<f32> = uv;
      cloudUV.x = (cloudUV.x + uniforms.time * 0.1) % 4 - 2.0;
      var cloudTime = uniforms.time * 0.5;
      var cloudY = -0.5;
      var cloudVal1 = sdCloud(cloudUV, 
                               vec2(0.1 + sin(cloudTime + 140.5)*0.1,cloudY), 
                               vec2(1.05 + cos(cloudTime * 0.9 - 36.56) * 0.1, cloudY), 
                               vec2(0.2 + cos(cloudTime * 0.867 + 387.165) * 0.1,0.25+cloudY), 
                               vec2(0.5 + cos(cloudTime * 0.9675 - 15.162) * 0.09, 0.25+cloudY), 0.075);
      cloudY = -0.6;
      var cloudVal2: f32 = sdCloud(cloudUV, 
                               vec2(-0.9 + cos(cloudTime * 1.02 + 541.75) * 0.1,cloudY), 
                               vec2(-0.5 + sin(cloudTime * 0.9 - 316.56) * 0.1, cloudY), 
                               vec2(-1.5 + cos(cloudTime * 0.867 + 37.165) * 0.1,0.25+cloudY), 
                               vec2(-0.6 + sin(cloudTime * 0.9675 + 665.162) * 0.09, 0.25+cloudY), 0.075);
      
      var cloudVal: f32 = min(cloudVal1, cloudVal2);
      
      //col = mix(col, vec3(1.0,1.0,0.0), smoothstep(0.0751, 0.075, cloudVal));
      color = mix(color, vec3(0.0, 0.0, 0.2), 1.0 - smoothstep(0.075 - 0.0001, 0.075, cloudVal));
      color += vec3(1.0, 1.0, 1.0)*(1.0 - smoothstep(0.0,0.01,abs(cloudVal - 0.075)));
    }

    color += fog * fog * fog;
    color = mix(vec3f(color.r, color.r, color.r) * 0.5, color, battery * 0.7);

    ${debugReturnStatements}

    return vec4<f32>(color, 1.0);
    // return vec4<f32>(uv, 0.0, 1.0);
  }
  `;
};
