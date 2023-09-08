type OutputSize = 1 | 2 | 3 | 4;

export interface DebugValuePackage {
  debugStep: number | [number, number];
  variableName: string;
  variableDeclaration: string;
  returnStatement: string;
}

export const createDebugValuePackage = (
  stepRange: number[] | number,
  size: OutputSize,
  _variableName: string
): DebugValuePackage => {
  let [debugStep, variableName, variableDeclaration, returnStatement] = [
    null,
    null,
    null,
    null,
  ];
  debugStep = stepRange;
  variableName = _variableName;
  switch (size) {
    case 1:
      {
        variableDeclaration = `var ${variableName}: f32 = 0.0;`;
        typeof stepRange !== 'number'
          ? (returnStatement = `
            if (
              uniforms.debugStep >= ${stepRange[0]} && 
              uniforms.debugStep <= ${stepRange[stepRange.length - 1]}
            ) {
              return vec4<f32>(${variableName}, 0.0, 0.0, 1.0);
            }
          `)
          : `
          if (uniforms.debugStep == ${debugStep}) {
            return vec4<f32>(${variableName}, 0.0, 0.0, 1.0);
          }
        `;
      }
      break;
    case 2:
      {
        variableDeclaration = `var ${variableName}: vec2<f32> = vec2<f32>(0.0, 0.0);`;
        typeof stepRange !== 'number'
          ? (returnStatement = `
            if (
              uniforms.debugStep >= ${stepRange[0]} && 
              uniforms.debugStep <= ${stepRange[stepRange.length - 1]}
            ) {
              return vec4<f32>(${variableName}, 0.0, 1.0);
            }
          `)
          : (returnStatement = `
          if (uniforms.debugStep == ${debugStep}) {
            return vec4<f32>(${variableName}, 0.0, 1.0);
          }
        `);
      }
      break;
    case 3:
      {
        variableDeclaration = `var ${variableName}: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);`;
        typeof stepRange !== 'number'
          ? (returnStatement = `
            if (
              uniforms.debugStep >= ${stepRange[0]} && 
              uniforms.debugStep <= ${stepRange[stepRange.length - 1]}
            ) {
              return vec4<f32>(${variableName}, 1.0);
            }
          `)
          : (returnStatement = `
          if (uniforms.debugStep == ${debugStep}) {
            return vec4<f32>(${variableName}, 1.0);
          }
        `);
      }
      break;
    case 4:
      {
        variableDeclaration = `var ${variableName}: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);`;
        typeof stepRange !== 'number'
          ? (returnStatement = `
            if (
              uniforms.debugStep >= ${stepRange[0]} && 
              uniforms.debugStep <= ${stepRange[stepRange.length - 1]}
            ) {
              return ${variableName};
            }
          `)
          : (returnStatement = `
          if (uniforms.debugStep == ${debugStep}) {
            return ${variableName};
          }
        `);
      }
      break;
  }
  return {
    debugStep,
    variableName,
    variableDeclaration,
    returnStatement,
  };
};

export const createAssignmentStatement = (
  debugPackage: DebugValuePackage,
  assignment: string
) => {
  return `${debugPackage.variableName} = ${assignment};`;
};

export const createWGSLUniform = (structName: string, keys: string[]) => {
  let retString = `struct ${structName} {\n`;
  for (let i = 0; i < keys.length; i++) {
    retString += `\t${keys[i]}: f32,\n`;
  }
  retString += `}\n`;
  return retString;
};

export type ShaderKeyInterface<T extends string[]> = {
  [K in T[number]]: number;
};

export const createDebugStepReturnStatement = (
  dataSize: 1 | 2 | 3 | 4,
  value: string
) => {
  switch (dataSize) {
    case 1:
      {
        return `return vec4<f32>(${value}, 0.0, 0.0, 1.0);`;
      }
      break;
    case 2:
      {
        return `return vec4<f32>(${value}, 0.0, 1.0);`;
      }
      break;
    case 3:
      {
        return `return vec4<f32>(${value}, 1.0);`;
      }
      break;
    case 4:
      {
        return `return ${value};`;
      }
      break;
  }
};

interface StepRange {
  start: number;
  end: number;
}

interface Step {
  exps: string[];
  size: 1 | 2 | 3 | 4;
  val: string;
}

export const createDebugStepAreaCollection = (steps: Step[]): string => {
  let retString = ``;
  let stepsCompleted = 0;
  for (const step of steps) {
    const { exps, size, val } = step;
    retString += createDebugStepArea(
      { start: stepsCompleted, end: stepsCompleted + exps.length - 1 },
      size,
      val
    );
    stepsCompleted = stepsCompleted + exps.length;
  }
  console.log(retString);
  return retString;
};

export const createDebugStepArea = (
  stepRange: StepRange,
  dataSize: 1 | 2 | 3 | 4,
  value: string
) => {
  return `
  if (uniforms.debugStep ${
    stepRange.start === stepRange.end
      ? `== ${stepRange.start}`
      : `>= ${stepRange.start} && uniforms.debugStep<= ${stepRange.end}`
  }) {\n\t${createDebugStepReturnStatement(dataSize, value)}\n}\n
  `;
};

export const createFragmentShaderResources = (argKeys: string[]) => {
  return `
${createWGSLUniform('Uniforms', argKeys)}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;`;
};
