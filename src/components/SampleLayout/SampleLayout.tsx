/* eslint-disable prettier/prettier */
import Head from 'next/head';
import { useRouter } from 'next/router';
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';

import type { GUI } from 'dat.gui';
import type { Stats } from 'stats-js';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { canvasVariants, debugButtonVariants, AnimationKeysType } from './SampleLayoutTypes';
import type { Editor, EditorConfiguration } from 'codemirror';
interface CodeMirrorEditor extends Editor {
  updatedSource: (source: string) => void;
}

import styles from './SampleLayout.module.scss';
import { useAppDispatch, useAppSelector } from '../../features/store';
import { changeDebugExplanations } from '../../features/debugInfo/debugInfoSlice';
import { useImmer } from 'use-immer';

type SourceFileInfo = {
  name: string;
  contents: string;
  editable?: boolean;
};

export type SampleInitParams = {
  canvas: HTMLCanvasElement;
  pageState: { active: boolean };
  gui?: GUI;
  stats?: Stats;
  debugValueRef: MutableRefObject<number>;
  debugOnRef: MutableRefObject<boolean>;
  canvasRef: MutableRefObject<HTMLCanvasElement>;
};

export type SampleInit = (params: SampleInitParams) => void | Promise<void> | Promise<string[]>;

if (process.browser) {
  require('codemirror/mode/javascript/javascript');
}

function makeCodeMirrorEditor(source: string) {
  const configuration: EditorConfiguration = {
    lineNumbers: true,
    lineWrapping: true,
    theme: 'monokai',
    readOnly: true,
    dragDrop: true,
  };

  let el: HTMLDivElement | null = null;
  let editor: CodeMirrorEditor;

  if (process.browser) {
    el = document.createElement('div');
    const CodeMirror = process.browser && require('codemirror');
    editor = CodeMirror(el, configuration);
  }

  function Container(props: React.ComponentProps<'div'>) {
    return (
      <div {...props}>
        <div
          ref={(div) => {
            if (el && div) {
              div.appendChild(el);
              editor.setOption('value', source);
            }
          }}
        />
      </div>
    );
  }
  return {
    Container,
  };
}

const SampleLayout: React.FunctionComponent<
  React.PropsWithChildren<{
    name: string;
    description: string;
    originTrial?: string;
    filename: string;
    gui?: boolean;
    stats?: boolean;
    init: SampleInit;
    sources: SourceFileInfo[];
  }>
> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debugButtonLeftRef = useRef<HTMLButtonElement | null>();
  const debugButtonRightRef = useRef<HTMLButtonElement | null>();
  const shadowY = useMotionValue(0);
  const sources = useMemo(
    () =>
      props.sources.map(({ name, contents }) => {
        return { name, ...makeCodeMirrorEditor(contents) };
      }),
    props.sources
  );


  const dispatch = useAppDispatch();
  const debugExplanations = useAppSelector(
    (state) => state.debugInfo.debugExplanations
  );

  const guiParentRef = useRef<HTMLDivElement | null>(null);
  const gui: GUI | undefined = useMemo(() => {
    if (props.gui && process.browser) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dat = require('dat.gui');
      return new dat.GUI({ autoPlace: false });
    }
    return undefined;
  }, []);

  const statsParentRef = useRef<HTMLDivElement | null>(null);
  const stats: Stats | undefined = useMemo(() => {
    if (props.stats && process.browser) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Stats = require('stats-js');
      return new Stats();
    }
    return undefined;
  }, []);

  const router = useRouter();
  const currentHash = router.asPath.match(/#([a-zA-Z0-9\.\/]+)/);

  const [error, setError] = useState<unknown | null>(null);
  const [debugStep, setDebugStep] = useState<number>(0);
  const debugValueRef = useRef<number>(0);
  const [debugOn, setDebugOn] = useState<boolean>(false);
  const debugOnRef = useRef<boolean>(false);
  const [hoverDebug, setHoverDebug] = useState<boolean>(false);
  const canvasAnimControls = useAnimation();
  const debugButtonLeftAnimController = useAnimation();
  const debugButtonRightAnimController = useAnimation();
  const [animationKeys, setAnimationKeys] = useImmer<AnimationKeysType>({
    canvas: '',
    debugButtonLeft: '',
    debugButtonRight: '',
  });

  useEffect(() => {
    if (debugOn) {
      setAnimationKeys((draft) => {
        draft.canvas = 'moveOffscreenRight';
      });
    } else if (animationKeys.canvas !== '') {
      setAnimationKeys((draft) => {
        draft.canvas = 'moveOffscreenLeft';
      });
    }
  }, [debugOn]);

  useEffect(() => {
    canvasAnimControls.start(animationKeys.canvas);
  }, [animationKeys.canvas, canvasAnimControls]);

  useEffect(() => {
    debugButtonLeftAnimController.start(animationKeys.debugButtonLeft);
  }, [animationKeys.debugButtonLeft, debugButtonLeftAnimController]);

  useEffect(() => {
    debugButtonRightAnimController.start(animationKeys.debugButtonRight)
  }, [animationKeys.debugButtonRight, debugButtonRightAnimController])

  const onIncrementDebugStep = () => {
    if (debugStep === debugExplanations.length - 1) {
      return;
    } else {
      setDebugStep(debugStep + 1);
      debugValueRef.current += 1;
    }
  };

  const onDecrementDebugStep = () => {
    if (debugStep === 0) {
      return;
    } else {
      setDebugStep(debugStep - 1);
      debugValueRef.current -= 1;
    }
  };

  const [activeHash, setActiveHash] = useState<string | null>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    console.log(e.key)
    switch(e.key) {
      case 'ArrowLeft':
      case 'A':
      case 'a': {
        onDecrementDebugStep();
      } break;
      case 'ArrowRight':
      case 'D':
      case 'd': {
        onIncrementDebugStep();
      } break;
      case 'ArrowUp':
      case 'W':
      case 'w': {
        if (debugOn) {
          setDebugOn(false)
        }
      } break;
      case 'ArrowDown':
      case 'S':
      case 's': {
        if (!debugOn) {
          setDebugOn(true);
        }   
      } break;
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [onDecrementDebugStep, onIncrementDebugStep])

  useEffect(() => {
    if (currentHash) {
      setActiveHash(currentHash[1]);
    } else {
      setActiveHash(sources[0].name);
    }

    if (gui && guiParentRef.current) {
      guiParentRef.current.appendChild(gui.domElement);
    }

    if (stats && statsParentRef.current) {
      stats.dom.style.position = 'absolute';
      stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
      statsParentRef.current.appendChild(stats.dom);
    }

    const pageState = {
      active: true,
    };
    try {
      const canvas = canvasRef.current;
      const p = props.init({
        canvas,
        pageState,
        gui,
        stats,
        debugValueRef,
        debugOnRef,
        canvasRef,
      });

      if (p instanceof Promise) {
        p.catch((err: Error) => {
          console.error(err);
          setError(err);
        });
        p.then((result) => {
          if (
            Array.isArray(result) &&
            result.every((item) => typeof item === 'string')
          ) {
            dispatch(changeDebugExplanations({ newExplanations: result }));
          }
        });
      }
    } catch (err) {
      console.error(err);
      setError(err);
    }
    return () => {
      pageState.active = false;
    };
  }, []);
  

  return (
    <main>
      <Head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .CodeMirror {
              height: auto !important;
              margin: 1em 0;
            }

            .CodeMirror-scroll {
              height: auto !important;
              overflow: visible !important;
            }
          `,
          }}
        />
        <title>{`${props.name} - WGSL Shader Depot`}</title>
        <meta name="description" content={props.description} />
        <meta httpEquiv="origin-trial" content={props.originTrial} />
      </Head>
      <div>
        <h1>{props.name}</h1>
        <a
          target="_blank"
          rel="noreferrer"
          href={`https://github.com/${process.env.REPOSITORY_NAME}/tree/main/${props.filename}`}
        >
          See it on Github!
        </a>
        <p>{props.description}</p>
        {error ? (
          <>
            <p>Is WebGPU Enabled?</p>
            <p>{`${error}`}</p>
          </>
        ) : null}
      </div>
      <motion.div className={styles.canvasContainer}>
        <div
          style={{
            position: 'absolute',
            left: 10,
          }}
          ref={statsParentRef}
        ></div>
        <div
          style={{
            position: 'absolute',
            right: 10,
            zIndex: 9,
          }}
          ref={guiParentRef}
        ></div>
        <motion.canvas
          variants={canvasVariants}
          animate={canvasAnimControls}
          onAnimationComplete={() => {
            if (debugOn) {
              debugOnRef.current = true;
              setAnimationKeys((draft) => {
                const anim: keyof typeof canvasVariants = 'moveOnscreenRight';
                draft.canvas = anim;
              });
            } else if (animationKeys.canvas !== '') {
              debugOnRef.current = false;
              setAnimationKeys((draft) => {
                const anim: keyof typeof canvasVariants = 'moveOnscreenLeft';
                draft.canvas = anim;
              });
            }
          }}
          ref={canvasRef}
        ></motion.canvas>
      </motion.div>
      {debugOn ? (
        <div className={styles.debugArea}>
          <motion.div className={styles.debugArea__Button__HoverAreaLeft}
            onHoverStart={() =>
              setAnimationKeys((draft) => {
                draft.debugButtonLeft = 'shiftLeft';
                return draft;
              })
            }
            onHoverEnd={() => {
              setAnimationKeys((draft) => {
                draft.debugButtonLeft = 'shiftBackFromLeft';
                return draft;
              });
            }}
          >
            <motion.button
              className={styles.debugArea__Button__Left}
              onClick={onDecrementDebugStep}
              animate={debugButtonLeftAnimController}
              variants={debugButtonVariants}
              ref={debugButtonLeftRef}
              onMouseMove={(event) => {
                const button = event.currentTarget;
                let offset = event.pageY - button.getBoundingClientRect().top - Math.round(button.clientHeight / 2);
                offset = Math.min(Math.max(offset, -4.0), 4.0);
                button.style.boxShadow = `30px ${offset * -1 / 2}px 1px -8px rgba(0, 0, 0, 0.3)`;
              }}
              onMouseLeave={(event) => {
                const button = event.currentTarget;
                button.style.boxShadow = '';
              }}
            >
              {`<`}
            </motion.button>
          </motion.div>
          <div className={styles.debugArea__DebugBlock}>
            <div className={styles.debugArea__DebugBlock__Explanation}>
              <motion.div
                style={{
                  alignItems: 'center',
                  marginTop: '4px',
                  textShadow: '2px 2px 2px 2px black',
                  marginRight: '2px',
                  height: 'auto',
                }}
              >
                {debugExplanations[debugStep]}
              </motion.div>
            </div>
            <div className={styles.debugArea__DebugBlock__Close}>
              <motion.div
                style={{
                  textDecoration: `${hoverDebug ? 'underline' : 'none'}`,
                  cursor: 'pointer',
                }}
                onHoverStart={() => {
                  setHoverDebug(true);
                }}
                onHoverEnd={() => {
                  setHoverDebug(false);
                }}
                onClick={() => {
                  setDebugOn(false);
                }}
              >
                {'(Close Debug)'}
              </motion.div>
            </div>
          </div>
          <motion.div className={styles.debugArea__Button__HoverAreaRight}
            onHoverStart={() =>
              setAnimationKeys((draft) => {
                draft.debugButtonRight = 'shiftRight';
                return draft;
              })
            }
            onHoverEnd={() => {
              setAnimationKeys((draft) => {
                draft.debugButtonRight = 'shiftBackFromRight';
                return draft;
              });
            }}
          >
            <motion.button
              className={styles.debugArea__Button__Right}
              onClick={onIncrementDebugStep}
              variants={debugButtonVariants}
              animate={debugButtonRightAnimController}
              ref={debugButtonRightRef}
            >
              {`>`}
            </motion.button>
          </motion.div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            backgroundColor: 'darkblue',
            width: 'auto',
            textAlign: 'center',
            justifyContent: 'center',
            marginTop: '10px',
            fontSize: '20px',
            height: 'auto',
          }}
        >
          <motion.div
            style={{
              alignItems: 'center',
              marginTop: '4px',
              textShadow: '2px 2px 2px 2px black',
              marginRight: '2px',
              height: 'auto',
              textDecoration: `${hoverDebug ? 'underline' : 'none'}`,
              cursor: 'pointer',
            }}
            onHoverStart={() => {
              setHoverDebug(true);
            }}
            onHoverEnd={() => {
              setHoverDebug(false);
            }}
            onClick={() => {
              setDebugOn(true);
              //debugOnRef.current = true;
            }}
          >
            {'(Open Debug)'}
          </motion.div>
        </div>
      )}
      <div>
        <nav className={styles.sourceFileNav}>
          <ul>
            {sources.map((src, i) => {
              return (
                <li 
                  key={i} 
                  draggable
                  onClick={() => {
                    setActiveHash(src.name);
                  }}
                >
                  <a
                    style={{pointerEvents: 'none'}}
                    href={`#${src.name}`}
                    data-active={activeHash == src.name}
                  >
                    {src.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        {sources.map((src, i) => {
          return (
            <src.Container
              className={styles.sourceFileContainer}
              data-active={activeHash == src.name}
              key={i}
            />
          );
        })}
      </div>
    </main>
  );
};

export default SampleLayout;

export const makeSample: (
  ...props: Parameters<typeof SampleLayout>
) => JSX.Element = (props) => {
  return <SampleLayout {...props} />;
};
