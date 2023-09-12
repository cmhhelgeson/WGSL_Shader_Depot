type BindGroupBindingLayout =
  | GPUBufferBindingLayout
  | GPUTextureBindingLayout
  | GPUSamplerBindingLayout
  | GPUStorageTextureBindingLayout
  | GPUExternalTextureBindingLayout;

export type BindGroupDescriptor = {
  bindGroups: GPUBindGroup[];
  bindGroupLayout: GPUBindGroupLayout;
};

type BindGroupDescriptorTemplate = {
  groupEntries: GPUBindGroupEntry[];
  layoutEntries: GPUBindGroupLayoutEntry[];
};

type ResourceTypeName =
  | 'buffer'
  | 'texture'
  | 'sampler'
  | 'externalTexture'
  | 'storageTexture';

/**
 * @param {number[]} bindings - The binding value of each resource in the bind group.
 * @param {number[]} visibilities - The GPUShaderStage visibility of the resource at the corresponding index.
 * @param {ResourceTypeName[]} resourceTypes - The resourceType at the corresponding index.
 * @returns {BindGroupDescriptor} An object containing an array of bindGroups and the bindGroupLayout they implement.
 */
export const createBindGroupDescriptor = (
  bindings: number[],
  visibilities: number[],
  resourceTypes: ResourceTypeName[],
  resourceLayouts: BindGroupBindingLayout[],
  resources: GPUBindingResource[][],
  label: string,
  device: GPUDevice
): BindGroupDescriptor => {
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  //const groupEntries: GPUBindGroupEntry[] = [];
  for (let i = 0; i < bindings.length; i++) {
    const layoutEntry: any = {};
    layoutEntry.binding = bindings[i];
    layoutEntry.visibility = visibilities[i % visibilities.length];
    layoutEntry[resourceTypes[i]] = resourceLayouts[i];
    layoutEntries.push(layoutEntry);
  }

  const bindGroupLayout = device.createBindGroupLayout({
    label: `${label}.bindGroupLayout`,
    entries: layoutEntries,
  });

  const bindGroups: GPUBindGroup[] = [];
  //i represent the bindGroup index, j represents the binding index of the resource within the bindgroup
  //i=0, j=0 bindGroup 0, binding: 0
  //i=1, j=1, bindGroup0 binding 1
  //NOTE: not the same as @group(0) @binding(1) group index within the fragment shader is set within a pipeline
  for (let i = 0; i < resources.length; i++) {
    const groupEntries: GPUBindGroupEntry[] = [];
    for (let j = 0; j < resources[0].length; j++) {
      const groupEntry: any = {};
      groupEntry.binding = j;
      groupEntry.resource = resources[i][j];
      groupEntries.push(groupEntry);
    }
    const newBindGroup = device.createBindGroup({
      label: `${label}.bindGroup${i}`,
      layout: bindGroupLayout,
      entries: groupEntries,
    });
    bindGroups.push(newBindGroup);
  }

  return {
    bindGroups,
    bindGroupLayout,
  };
};

export const createBindGroupDescriptorTemplate = (
  bindings: number[],
  visibilities: number[],
  resourceTypes: ResourceTypeName[],
  resourceLayouts: BindGroupBindingLayout[],
  resources: GPUBindingResource[]
): BindGroupDescriptorTemplate => {
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  const groupEntries: GPUBindGroupEntry[] = [];
  for (let i = 0; i < resources.length; i++) {
    const layoutEntry: any = {};
    layoutEntry.binding = bindings[i];
    layoutEntry.visibility = visibilities[i % visibilities.length];
    layoutEntry[resourceTypes[i]] = resourceLayouts[i];

    layoutEntries.push(layoutEntry);

    const groupEntry: any = {};
    groupEntry.binding = bindings[i];
    groupEntry.resource = resources[i];

    groupEntries.push(groupEntry);
  }

  return {
    groupEntries,
    layoutEntries,
  };
};
