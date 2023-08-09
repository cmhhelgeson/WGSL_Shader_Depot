import { useState, useEffect } from 'react';
import 'react-pro-sidebar/dist/css/styles.css';
import styles from './app_sidebar.module.scss';
import { motion, useAnimation } from 'framer-motion';

interface LoadingBubbleProps {
  delay: number;
  wasItemSelected: boolean;
  doneLoading: boolean;
}

export const LoadingBubble = ({
  delay,
  wasItemSelected,
  doneLoading,
}: LoadingBubbleProps) => {
  const bubbleController = useAnimation();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (wasItemSelected) {
      bubbleController.start({
        opacity: [0, 0.25, 0.5, 0.75, 1],
        scale: [1, 0.4, 0.4, 0.4, 1],
        translateY: [-8, 0, -7, -3, -8],
        transition: {
          duration: 1,
          ease: 'easeInOut',
          times: [0, 0.3, 0.5, 0.7, 1],
          delay: delay,
        },
      });
      setIsLoading(true);
    }
  }, [wasItemSelected, bubbleController]);

  useEffect(() => {
    if (isLoading) {
      bubbleController.start({
        scale: [1, 0.4, 0.4, 0.4, 1],
        translateY: [-8, 0, -7, -3, -8],
        transition: {
          duration: 2.5,
          ease: 'easeInOut',
          repeat: Infinity,
          times: [0, 0.3, 0.5, 0.7, 1],
          delay: delay,
        },
      });
    }
  }, [isLoading, bubbleController]);

  useEffect(() => {
    if (doneLoading) {
      bubbleController.stop();

      bubbleController.start({
        opacity: [1, 0.75, 0.5, 0.25, 0],
        scale: [1, 0.4, 0.4, 0.4, 1],
        translateY: [-8, 0, -7, -3, -8],
        transition: {
          duration: 2.5,
          ease: 'easeInOut',
          times: [0, 0.3, 0.5, 0.7, 1],
          delay: delay,
        },
      });
      setIsLoading(false);
    }
  }, [doneLoading, bubbleController]);

  return (
    <motion.div
      className={styles.SidebarArea__Menu__List__ListItem__LoadingGrid__Cell}
      initial={{ opacity: '0%' }}
      animate={bubbleController}
    ></motion.div>
  );
};
