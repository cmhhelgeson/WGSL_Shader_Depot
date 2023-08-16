import Head from 'next/head';
import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { appStore, wrapper } from '../features/store';

import './styles.css';
import styles from './MainLayout.module.css';

import { Provider } from 'react-redux';
import AppSidebar from '../components/AppSidebar/AppSidebar';

const title = 'WGSL Shader Depot';

const MainLayout: React.FunctionComponent<AppProps> = ({
  Component,
  pageProps,
}) => {
  const router = useRouter();
  const { store } = wrapper.useWrappedStore(appStore);

  const oldPathSyntaxMatch = router.asPath.match(/(\?wgsl=[01])#(\S+)/);
  if (oldPathSyntaxMatch) {
    const slug = oldPathSyntaxMatch[2];
    router.replace(`/samples/${slug}`);
    return <></>;
  }

  return (
    <Provider store={store}>
      <>
        <Head>
          <title>{title}</title>
          <meta
            name="description"
            content="WGSL Shader Depot contains a set of examples exploring shaders using the WebGPU/WGSL Framework."
          />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, shrink-to-fit=no"
          />
        </Head>
        <div className={styles.wrapper}>
          <AppSidebar />
          <Component {...pageProps} />
        </div>
      </>
    </Provider>
  );
};

export default MainLayout;
