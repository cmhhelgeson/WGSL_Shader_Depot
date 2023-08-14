import dynamic from 'next/dynamic';
import { GetStaticPaths, GetStaticProps } from 'next';

type PathParams = {
  slug: string;
};

type Props = {
  slug: string;
};

export const pages = {
  renderBundles: dynamic(() => import('../../sample/renderBundles/main')),
  normalMapping: dynamic(() => import('../../sample/normalMapping/main')),
  comanche: dynamic(() => import('../../sample/comancheVoxel/main')),
  mixExample: dynamic(() => import('../../sample/mixExample/main')),
  CRT: dynamic(() => import('../../sample/crt/main')),
  grid: dynamic(() => import('../../sample/grid/main')),
  cyberpunkGrid: dynamic(() => import('../../sample/cyberpunkGrid/main')),
  gltf: dynamic(() => import('../../sample/gltfViewer/main')),
  computeBalls: dynamic(() => import('../../sample/computeBalls/main')),
};

export const fragmentPages = {
  mixExample: dynamic(() => import('../../sample/mixExample/main')),
  CRT: dynamic(() => import('../../sample/crt/main')),
  grid: dynamic(() => import('../../sample/grid/main')),
  cyberpunkGrid: dynamic(() => import('../../sample/cyberpunkGrid/main')),
};

export const vertexPages = {
  gltf: dynamic(() => import('../../sample/gltfViewer/main')),
  renderBundles: dynamic(() => import('../../sample/renderBundles/main')),
  normalMapping: dynamic(() => import('../../sample/normalMapping/main')),
};

export const computePages = {
  computeBalls: dynamic(() => import('../../sample/computeBalls/main')),
};

function Page({ slug }: Props): JSX.Element {
  const PageComponent = pages[slug];
  return <PageComponent />;
}

export const getStaticPaths: GetStaticPaths<PathParams> = async () => {
  return {
    paths: Object.keys(pages).map((p) => {
      return { params: { slug: p } };
    }),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<Props, PathParams> = async ({
  params,
}) => {
  return {
    props: {
      ...params,
    },
  };
};

export default Page;
