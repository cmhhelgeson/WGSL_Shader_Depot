import dynamic from 'next/dynamic';
import { GetStaticPaths, GetStaticProps } from 'next';

type PathParams = {
  slug: string;
};

type Props = {
  slug: string;
};

export const pages = {
  simpleVertex: dynamic(() => import('../../sample/vertex/simpleVertex/main')),
  normalMapping: dynamic(
    () => import('../../sample/vertex/normalMapping/main')
  ),
  comanche: dynamic(() => import('../../sample/fragment/comancheVoxel/main')),
  mixExample: dynamic(() => import('../../sample/fragment/mixExample/main')),
  CRT: dynamic(() => import('../../sample/fragment/crt/main')),
  grid: dynamic(() => import('../../sample/fragment/grid/main')),
  cyberpunkGrid: dynamic(
    () => import('../../sample/fragment/cyberpunkGrid/main')
  ),
  gltf: dynamic(() => import('../../sample/vertex/gltfViewer/main')),
  computeBalls: dynamic(() => import('../../sample/compute/computeBalls/main')),
  micrograd: dynamic(() => import('../../sample/micrograd/main')),
  complexCRT: dynamic(() => import('../../sample/fragment/complexCRT/main')),
  sdfCircle: dynamic(() => import('../../sample/sdfCircle/main')),
  bitonicSort: dynamic(() => import('../../sample/compute/bitonicSort/main')),
};

export const fragmentPages = {
  mixExample: dynamic(() => import('../../sample/fragment/mixExample/main')),
  CRT: dynamic(() => import('../../sample/fragment/crt/main')),
  grid: dynamic(() => import('../../sample/fragment/grid/main')),
  cyberpunkGrid: dynamic(
    () => import('../../sample/fragment/cyberpunkGrid/main')
  ),
  complexCRT: dynamic(() => import('../../sample/fragment/complexCRT/main')),
};

export const vertexPages = {
  gltf: dynamic(() => import('../../sample/vertex/gltfViewer/main')),
  simpleVertex: dynamic(() => import('../../sample/vertex/simpleVertex/main')),
  normalMapping: dynamic(
    () => import('../../sample/vertex/normalMapping/main')
  ),
};

export const computePages = {
  computeBalls: dynamic(() => import('../../sample/compute/computeBalls/main')),
  bitonicSort: dynamic(() => import('../../sample/compute/bitonicSort/main')),
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
