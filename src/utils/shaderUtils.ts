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
  console.log(retString);
  return retString;
};
