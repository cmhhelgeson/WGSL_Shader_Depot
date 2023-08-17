import styles from './HomePage.module.css';

const HomePage: React.FunctionComponent = () => {
  return (
    <main className={styles.homePage}>
      <p>
        WGSL Shader Depot is a fork of WebGPU Samples desgined to demonstrate
        the <a href="https://www.w3.org/TR/WGSL/">WGSL Shader language</a>.
        Please see the current implementation status and how to run WebGPU in
        your browser at <a href="//webgpu.io">webgpu.io</a>.
      </p>
    </main>
  );
};

export default HomePage;
