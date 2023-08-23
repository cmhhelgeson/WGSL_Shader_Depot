//https://github.com/trekhleb/micrograd-ts/blob/main/micrograd/engine.ts

type ValueParams = { op?: string; label?: string; prev?: Value[] };

// Stores a single scalar value and its gradient.
export class Value {
  data: number;
  grad = 0.0;
  label: string;
  prev: Value[];
  op: string | null;
  uuid?: string;

  constructor(data: number, params: ValueParams = {}) {
    this.data = data;
    this.op = params?.op ?? null;
    this.label = params?.label ?? '';
    this.prev = params?.prev ?? [];
  }

  private toVal(v: Value | number): Value {
    return typeof v === 'number' ? new Value(v) : v;
  }

  private backwardStep() {
    return;
  }

  add(v: Value | number, label?: string): Value {
    const other = this.toVal(v);
    const out = new Value(this.data + other.data, {
      prev: [this, other],
      op: '+',
    });
    out.backwardStep = () => {
      this.grad += 1 * out.grad;
      other.grad += 1 * out.grad;
    };
    out.label = label ? label : '';
    return out;
  }

  sub(v: Value | number, label?: string): Value {
    const other = this.toVal(v);
    const out = new Value(this.data - other.data, {
      prev: [this, other],
      op: '-',
    });
    out.backwardStep = () => {
      this.grad += 1 * out.grad;
      other.grad += -1 * out.grad;
    };
    out.label = label ? label : '';
    return out;
  }

  mul(v: Value | number, label?: string): Value {
    const other = this.toVal(v);
    const out = new Value(this.data * other.data, {
      prev: [this, other],
      op: '*',
    });
    out.backwardStep = () => {
      this.grad += other.data * out.grad;
      other.grad += this.data * out.grad;
    };
    out.label = label ? label : '';
    return out;
  }

  div(v: Value | number, label?: string): Value {
    const other = this.toVal(v);
    const out = new Value(this.data / other.data, {
      prev: [this, other],
      op: '/',
    });
    out.backwardStep = () => {
      this.grad += (1 / other.data) * out.grad;
      other.grad += (-this.data / other.data ** 2) * out.grad;
    };
    out.label = label ? label : '';
    return out;
  }

  pow(other: number, label?: string): Value {
    if (typeof other !== 'number')
      throw new Error('Only supporting int/float powers');
    const out = new Value(this.data ** other, {
      prev: [this],
      op: '^',
    });
    out.backwardStep = () => {
      this.grad += other * this.data ** (other - 1) * out.grad;
    };
    out.label = label ? label : '';
    return out;
  }

  exp(label?: string): Value {
    const out = new Value(Math.exp(this.data), { prev: [this], op: 'e' });
    out.backwardStep = () => {
      this.grad += out.data * out.grad;
    };
    out.label = label ? label : '';
    return out;
  }

  tanh(label?: string): Value {
    const out = new Value(Math.tanh(this.data), { prev: [this], op: 'tanh' });
    out.backwardStep = () => (this.grad += (1 - out.data ** 2) * out.grad);
    out.label = label ? label : '';
    return out;
  }

  relu(label?: string): Value {
    const reluVal = this.data < 0 ? 0 : this.data;
    const out = new Value(reluVal, { prev: [this], op: 'relu' });
    out.backwardStep = () => (this.grad += (out.data > 0 ? 1 : 0) * out.grad);
    out.label = label ? label : '';
    return out;
  }

  backward(): void {
    // Topological order of all the children in the graph.
    const topo: Value[] = [];
    const visited = new Set();
    const buildTopo = (v: Value) => {
      if (visited.has(v)) return;
      visited.add(v);
      for (const parent of v.prev) buildTopo(parent);
      topo.push(v);
    };
    buildTopo(this);
    topo.reverse();

    // Go one variable at a time and apply the chain rule to get its gradient.
    this.grad = 1;
    for (const node of topo) node.backwardStep();
  }
}

// Shortcut for: new Value(data, params)
export const v = (d: number, p: ValueParams = {}): Value => new Value(d, p);

export const createNodeText = (mvg: Value): string => {
  let accString = '';
  accString += `
  <TR>\n
    <TD><B>${mvg.label}</B></TD>\n
  </TR>
  <TR>\n
    <TD><B>${mvg.data}</TD>\n
  </TR>\n
  <TR>\n
    <TD><B>Gradient: ${mvg.grad}</B></TD>\n
  </TR>\n
  `;
  return accString;
};

interface MVGGraphData {
  nodes: Set<Value>;
  edges: Set<[Value, Value]>;
}

const traceMVG = (root: Value): MVGGraphData => {
  const nodes = new Set<Value>();
  const edges = new Set<[Value, Value]>();

  const build = (mvg: Value) => {
    if (!nodes.has(mvg)) {
      nodes.add(mvg);
      for (const child of mvg.prev) {
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
  root: Value,
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
      node.grad
    } }"`;
    digraphString += `\t${uuid} [fillcolor="${nodeFillColor}", style="filled", label=${content}, xlabel="${node.label}", xlabelloc="t", labelfontcolor="white", shape="record"]\n`;
    if (node.op) {
      const opId = getOpIdString(uuid, node.op);
      digraphString += `\t${opId} [label="${node.op}" fillcolor="${nodeFillColor}" style="filled"];\n`;
      digraphString += `\t${opId} -> ${uuid};\n`;
    }
  }

  for (const [n1, n2] of edges) {
    digraphString += `\t${n1.uuid} -> ${n2.uuid + 'plus'};\n`;
  }
  digraphString += '}';
  return digraphString;
};
