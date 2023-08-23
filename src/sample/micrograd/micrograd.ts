import { v1 as uuidv4 } from 'uuid';

interface MicroGradValue {
  data: number;
  children: Set<MicroGradValue>;
  scalarOp: string;
  gradient?: number;
  label?: string;
  backwards: null | (() => void);
  uuid?: string;
}

interface MVGInit {
  data: number;
  label?: string;
  children?: MicroGradValue[];
  op?: string;
}

export const MVGCreate = (init: MVGInit): MicroGradValue => {
  const setChildren = new Set<MicroGradValue>();
  if (init.children) {
    init.children.forEach((child) => {
      setChildren.add(child);
    });
  }
  return {
    data: init.data,
    children: setChildren,
    scalarOp: init.op ? init.op : '',
    gradient: 0.0,
    label: init.label ? init.label : '',
    backwards: () => {
      return;
    },
  };
};

export const MVGExp = (a: MicroGradValue, label?: string): MicroGradValue => {
  const output = MVGCreate({
    data: Math.exp(a.data),
    children: [a],
    op: 'e',
  });
  if (label) {
    output.label = label;
  }
  output.gradient += output.data * output.gradient;
  return output;
};

export const MVGPow = (
  a: MicroGradValue,
  b: number,
  label?: string
): MicroGradValue => {
  const output = MVGCreate({
    data: a.data ** b,
    label: label ? label : '',
    children: [a],
    op: '**',
  });

  output.backwards = () => {
    output.gradient += b * a.data ** (b - 1) * output.gradient;
  };

  return output;
};

//Local gradient: Derivative of output node with respect to inputs
export const MGVMultiply = (
  a: MicroGradValue,
  b: MicroGradValue,
  productLabel?: string
): MicroGradValue => {
  const output = MVGCreate({
    data: a.data * b.data,
    op: '+',
    children: [a, b],
  });
  output.backwards = () => {
    a.gradient += b.data * output.gradient;
    b.gradient += a.data * output.gradient;
    console.log(`${a.label}'s gradient is: ${a.gradient}`);
    console.log(`${b.label}'s gradient is: ${b.gradient}`);
  };
  if (productLabel) {
    output.label = productLabel;
  }
  return output;
};

export const MGVAdd = (
  a: MicroGradValue,
  b: MicroGradValue,
  sumLabel?: string
): MicroGradValue => {
  const output = MVGCreate({
    data: a.data + b.data,
    children: [a, b],
    op: '+',
  });
  output.backwards = () => {
    a.gradient += 1.0 * output.gradient;
    b.gradient += 1.0 * output.gradient;
  };
  if (sumLabel) {
    output.label = sumLabel;
  }
  return output;
};

export const MGVTanh = (a: MicroGradValue, label?: string): MicroGradValue => {
  const t = Math.tanh(a.data);
  const output = MVGCreate({
    data: t,
    op: 'tanh',
    children: [a],
  });
  output.backwards = () => {
    a.gradient += (1 - t ** 2) * output.gradient;
  };
  if (label) {
    output.label = label;
  }
  return output;
};

export const createNodeText = (mvg: MicroGradValue): string => {
  let accString = '';
  accString += `
  <TR>\n
    <TD><B>${mvg.label}</B></TD>\n
  </TR>
  <TR>\n
    <TD><B>${mvg.data}</TD>\n
  </TR>\n
  <TR>\n
    <TD><B>Gradient: ${mvg.gradient}</B></TD>\n
  </TR>\n
  `;
  return accString;
};

interface MVGGraphData {
  nodes: Set<MicroGradValue>;
  edges: Set<[MicroGradValue, MicroGradValue]>;
}

const traceMVG = (root: MicroGradValue): MVGGraphData => {
  const nodes = new Set<MicroGradValue>();
  const edges = new Set<[MicroGradValue, MicroGradValue]>();

  const build = (mvg: MicroGradValue) => {
    if (!nodes.has(mvg)) {
      nodes.add(mvg);
      for (const child of mvg.children) {
        edges.add([child, mvg]);
        build(child);
      }
    }
  };
  build(root);
  return {
    nodes,
    edges,
  };
};

export const completeBackwards = (root: MicroGradValue) => {
  const topo: MicroGradValue[] = [];
  const visited = new Set();

  const buildTopo = (mvg: MicroGradValue) => {
    if (visited.has(mvg)) {
      return;
    }
    visited.add(mvg);
    for (const child of mvg.children) {
      buildTopo(child);
    }
    topo.push(mvg);
  };
  buildTopo(root);
  topo.reverse();
  root.gradient = 1.0;
  for (const node of topo) {
    console.log(`Backpropogating on node ${node.label}`);
    node.backwards();
  }
};

const getOpIdString = (uuid: string, op: string): string => {
  switch (op) {
    case '*':
      {
        return uuid + 'mult';
      }
      break;
    case '+':
      {
        return uuid + 'plus';
      }
      break;
    case 'tanh':
      {
        return uuid + 'tanh';
      }
      break;
    default:
      {
        return uuid + 'nop';
      }
      break;
  }
};

type RankDirType = 'LR' | 'TB';
export const createMVGGraph = (
  root: MicroGradValue,
  digraphTitle: string,
  nodesep: number,
  rankdir: RankDirType,
  bgcolor: string,
  nodeFillColor: string
) => {
  const { nodes, edges } = traceMVG(root);
  let digraphString = `digraph G {\n\tbgcolor="${bgcolor}";\n\tformat="svg";\n\trankdir="${rankdir}";\n\tnodesep=${nodesep};\n`;
  digraphString += `\tedge [color="white"];\n\tnode [fontcolor="black"];\n`;
  for (const node of nodes) {
    //Generate unique id for each node
    const uuid = 'd' + Math.floor(Math.random() * 10000).toString(10);
    //const uuid: string = uuidv4();
    //uuid.replace(/-/g, '0');
    node.uuid = uuid;
    const content = `"{ ${node.label} | data: ${node.data.toFixed(4)} | grad: ${
      node.gradient
    } }"`;
    digraphString += `\t${uuid} [fillcolor="${nodeFillColor}", style="filled", label=${content}, xlabel="${node.label}", xlabelloc="t", labelfontcolor="white", shape="record"]\n`;
    if (node.scalarOp) {
      const opId = getOpIdString(uuid, node.scalarOp);
      digraphString += `\t${opId} [label="${node.scalarOp}" fillcolor="${nodeFillColor}" style="filled"];\n`;
      digraphString += `\t${opId} -> ${uuid};\n`;
    }
  }

  for (const [n1, n2] of edges) {
    digraphString += `\t${n1.uuid} -> ${n2.uuid + 'plus'};\n`;
  }
  digraphString += '}';
  return digraphString;
};

export class Neuron {
  w: MicroGradValue[] = [];
  b: MicroGradValue;
  constructor(nin: number) {
    for (let i = 0; i < nin; i++) {
      const wi = MVGCreate({ data: Math.random() * 2 - 1, label: `w${i}`});
      this.w.push(wi);
    }
  }
}
