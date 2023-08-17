interface MicroGradValue {
  data: number;
  children: MicroGradValue[];
  scalarOp: string;
  gradient: number;
}

export const MGVMultiply = (
  a: MicroGradValue,
  b: MicroGradValue
): MicroGradValue => {
  return {
    data: a.data * b.data,
    children: [],
    scalarOp: '*',
    gradient: 0,
  };
};

export const MGVAdd = (
  a: MicroGradValue,
  b: MicroGradValue
): MicroGradValue => {
  return {
    data: a.data + b.data,
    children: [],
    scalarOp: '+',
    gradient: 0,
  };
};

export const MGVSubtract = (
  a: MicroGradValue,
  b: MicroGradValue
): MicroGradValue => {
  return {
    data: a.data - b.data,
    children: [],
    scalarOp: '-',
    gradient: 0,
  };
};

export const MGVDivide = (
  a: MicroGradValue,
  b: MicroGradValue
): MicroGradValue => {
  return {
    data: a.data / b.data,
    children: [],
    scalarOp: '/',
    gradient: 0,
  };
};
