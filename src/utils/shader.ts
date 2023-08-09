type OutputSize = 1 | 2 | 3 | 4;

export interface DebugValuePackage {
  debugStep: number;
  variableName: string;
  variableDeclaration: string;
  returnStatement: string;
}

//NOTE: All of this is way too complicated but I don't care enough to fix it right now.

export const createDebugValuePackage = (
  _debugStep: number,
  size: OutputSize,
  _variableName: string
): DebugValuePackage => {
  let [debugStep, variableName, variableDeclaration, returnStatement] = [
    null,
    null,
    null,
    null,
  ];
  debugStep = _debugStep;
  variableName = _variableName;
  switch (size) {
    case 1:
      {
        variableDeclaration = `var ${variableName}: f32 = 0.0;`;
        returnStatement = `
          if (uniforms.debugStep == ${debugStep}) {
            return vec4<f32>(${variableName}, 0.0, 0.0, 1.0);
          }
        `;
      }
      break;
    case 2:
      {
        variableDeclaration = `var ${variableName}: vec2<f32> = vec2<f32>(0.0, 0.0);`;
        returnStatement = `
          if (uniforms.debugStep == ${debugStep}) {
            return vec4<f32>(${variableName}, 0.0, 1.0);
          }
        `;
      }
      break;
    case 3:
      {
        variableDeclaration = `var ${variableName}: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);`;
        returnStatement = `
          if (uniforms.debugStep == ${debugStep}) {
            return vec4<f32>(${variableName}, 1.0);
          }
        `;
      }
      break;
    case 4:
      {
        variableDeclaration = `var ${variableName}: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);`;
        returnStatement = `
          if (uniforms.debugStep == ${debugStep}) {
            return ${variableName};
          }
        `;
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
