import { useState, useEffect, SetStateAction, Dispatch } from 'react';
import 'react-pro-sidebar/dist/css/styles.css';
import styles from './app_sidebar.module.scss';
import { motion, useAnimation } from 'framer-motion';
import { LoadingBubble } from './LoadingBubble';
import {
  listItemVariants,
  subItemDigitTerminatorVariants,
  SubItemAnimationKeysType,
} from './AppSidebarTypes';
import { useImmer } from 'use-immer';
import { useRouter } from 'next/router';

interface SubItemProps {
  slug: string;
  idx: number;
  itemOpen: boolean;
  selected: string;
  setSelected: Dispatch<SetStateAction<string>>;
}

export const SubItem = ({ slug, idx, itemOpen, setSelected }: SubItemProps) => {
  const router = useRouter();
  const digitTerminatorController = useAnimation();
  const [animationKeys, setAnimationKeys] = useImmer<SubItemAnimationKeysType>({
    digitTerminator: '',
  });
  const [wasItemSelected, setWasItemSelected] = useState<boolean>(false);
  const [doneLoading, setDoneLoading] = useState<boolean>(true);

  useEffect(() => {
    const handlePageLoadComplete = () => {
      setDoneLoading(true);
      setWasItemSelected(false);
    };

    router.events.on('routeChangeComplete', handlePageLoadComplete);

    return () => {
      router.events.off('routeChangeComplete', handlePageLoadComplete);
    };
  }, []);

  useEffect(() => {
    digitTerminatorController.start(animationKeys.digitTerminator);
  }, [animationKeys.digitTerminator, digitTerminatorController]);

  return (
    <motion.li
      key={slug}
      className={styles.SidebarArea__Menu__List__ListItem}
      variants={listItemVariants}
      onClick={() => {
        if (itemOpen) {
          router.push(`/samples/${slug}`);
          setWasItemSelected(true);
          setSelected(`${slug}`);
          setDoneLoading(false);
          setAnimationKeys((draft) => {
            draft.digitTerminator = 'coil';
          });
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
          }}
        >
          <div className={styles.SidebarArea__Menu__List__ListItem__Number}>
            {`${idx + 1}`}
          </div>
          <motion.div
            className={
              styles.SidebarArea__Menu__List__ListItem__NumberTerminator
            }
            variants={subItemDigitTerminatorVariants}
            animate={digitTerminatorController}
            onAnimationComplete={() => {
              setAnimationKeys((draft) => {
                draft.digitTerminator = 'release';
              });
            }}
          >
            {`.`}
          </motion.div>
        </div>
        <div className={styles.SidebarArea__Menu__List__ListItem__Text}>
          {`${slug}`}
        </div>
      </div>
      <div className={styles.SidebarArea__Menu__List__ListItem__LoadingGrid}>
        <LoadingBubble
          delay={0}
          wasItemSelected={wasItemSelected}
          doneLoading={doneLoading}
        ></LoadingBubble>
        <LoadingBubble
          delay={0.2}
          wasItemSelected={wasItemSelected}
          doneLoading={doneLoading}
        ></LoadingBubble>
        <LoadingBubble
          delay={0.4}
          wasItemSelected={wasItemSelected}
          doneLoading={doneLoading}
        ></LoadingBubble>
      </div>
    </motion.li>
  );
};
