import dynamic from 'next/dynamic';
import { GetStaticPaths, GetStaticProps } from 'next';

type PathParams = {
  slug: string;
};

type Props = {
  slug: string;
};

export const pages = {
  simpleVertex: dynamic(() => import('../../sample/simpleVertex/main')),
  normalMapping: dynamic(() => import('../../sample/normalMapping/main')),
  comanche: dynamic(() => import('../../sample/comancheVoxel/main')),
  mixExample: dynamic(() => import('../../sample/mixExample/main')),
  CRT: dynamic(() => import('../../sample/crt/main')),
  grid: dynamic(() => import('../../sample/grid/main')),
  cyberpunkGrid: dynamic(() => import('../../sample/cyberpunkGrid/main')),
  gltf: dynamic(() => import('../../sample/gltfViewer/main')),
  computeBalls: dynamic(() => import('../../sample/computeBalls/main')),
  micrograd: dynamic(() => import('../../sample/micrograd/main')),
  complexCRT: dynamic(() => import('../../sample/complexCRT/main')),
  sdfCircle: dynamic(() => import('../../sample/sdfCircle/main')),
};

export const fragmentPages = {
  mixExample: dynamic(() => import('../../sample/mixExample/main')),
  CRT: dynamic(() => import('../../sample/crt/main')),
  grid: dynamic(() => import('../../sample/grid/main')),
  cyberpunkGrid: dynamic(() => import('../../sample/cyberpunkGrid/main')),
  complexCRT: dynamic(() => import('../../sample/complexCRT/main')),
  sdfCircle: dynamic(() => import('../../sample/sdfCircle/main')),
};

export const vertexPages = {
  gltf: dynamic(() => import('../../sample/gltfViewer/main')),
  simpleVertex: dynamic(() => import('../../sample/simpleVertex/main')),
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
