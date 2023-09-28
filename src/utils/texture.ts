export const createTextureFromImage = (
  device: GPUDevice,
  bitmap: ImageBitmap
) => {
  const texture: GPUTexture = device.createTexture({
    size: [bitmap.width, bitmap.height, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture: texture },
    [bitmap.width, bitmap.height]
  );
  return texture;
};

export interface PBRDescriptor {
  diffuse?: GPUTexture;
  normal?: GPUTexture;
  height?: GPUTexture;
}

interface URLLoad {
  url: string;
  type: keyof PBRDescriptor;
}

export const createPBRDescriptor = async (
  device: GPUDevice,
  urls: string[]
): Promise<PBRDescriptor> => {
  const imgAssetPrepend = '/img/';
  const loads = urls.map((url) => {
    const splits = url.split('_');
    const ttype = splits[splits.length - 1].split('.')[0];
    const load: URLLoad = {
      url: imgAssetPrepend + url,
      type: ttype as keyof PBRDescriptor,
    };
    return load;
  });
  console.log(loads);
  const pbr: PBRDescriptor = {};
  for (let i = 0; i < loads.length; i++) {
    console.log(loads[i].url);
    console.log(import.meta.url);
    let texture: GPUTexture;
    {
      const response = await fetch(loads[i].url);
      const imageBitmap = await createImageBitmap(await response.blob());
      texture = createTextureFromImage(device, imageBitmap);
    }

    console.log(loads[i].type);

    switch (loads[i].type) {
      case 'diffuse':
        {
          pbr.diffuse = texture;
        }
        break;
      case 'height':
        {
          pbr.height = texture;
        }
        break;
      case 'normal':
        {
          pbr.normal = texture;
        }
        break;
    }
  }
  return pbr;
};
