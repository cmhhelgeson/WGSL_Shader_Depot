import { useState, useRef, useEffect, SetStateAction, Dispatch } from 'react';
import { Typography } from '@mui/material';
import 'react-pro-sidebar/dist/css/styles.css';
import styles from './app_sidebar.module.scss';
import { motion, useAnimation } from 'framer-motion';
import { SubItem } from './SubItem';

import {
  triangleVariants,
  listVariants,
  AppSidebarAnimationKeysType,
} from './AppSidebarTypes';
import { useImmer } from 'use-immer';

interface ItemProps {
  title: string;
  collapsedTitle?: string;
  icon: any;
  to?: string;
  selected: string;
  setSelected: Dispatch<SetStateAction<string>>;
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
  subItems: string[];
  mobile?: boolean;
}

export const Item = ({
  title,
  collapsedTitle,
  icon,
  isCollapsed,
  setIsCollapsed,
  subItems,
  selected,
  setSelected,
  mobile,
}: ItemProps) => {
  if (!collapsedTitle) {
    collapsedTitle = title;
  }

  const itemRef = useRef<HTMLDivElement>(null);

  const [animationKeys, setAnimationKeys] =
    useImmer<AppSidebarAnimationKeysType>({
      triangle: '',
      list: 'close',
    });

  const [itemOpen, setItemOpen] = useState<boolean>(false);

  const triangleController = useAnimation();
  const listController = useAnimation();

  useEffect(() => {
    triangleController.start(animationKeys.triangle);
  }, [animationKeys.triangle, triangleController]);

  useEffect(() => {
    listController.start(animationKeys.list);
  }, [animationKeys.list, listController]);

  useEffect(() => {
    if (itemOpen) {
      setAnimationKeys((draft) => {
        draft.list = 'open';
      });
    } else if (animationKeys.list !== '') {
      setAnimationKeys((draft) => {
        draft.list = 'close';
      });
    }
  }, [itemOpen]);

  useEffect(() => {
    if (isCollapsed) {
      setItemOpen(false);
    }
  }, [isCollapsed]);

  return (
    <div
      className={styles.SidebarArea__Menu__SelectableMenuItem}
      onClick={() => {
        if (!itemOpen) {
          setItemOpen(!itemOpen);
          setAnimationKeys((draft) => {
            if (draft.triangle === 'close' || draft.triangle === '') {
              draft.triangle = 'open';
            } else {
              draft.triangle = 'close';
            }
            return draft;
          });
        }
      }}
      ref={itemRef}
    >
      <div
        className={styles.SidebarArea__Menu__SelectableMenuItem__Layout}
        style={{
          gridTemplateColumns: isCollapsed ? '' : '20% 80%',
          gridTemplateRows: isCollapsed ? '60% 40%' : '',
          flexDirection: isCollapsed ? 'column' : 'row',
        }}
        onClick={() => {
          if (!itemOpen && isCollapsed === true) {
            setItemOpen(!itemOpen);
            setIsCollapsed(false);
          }
          if (itemOpen) {
            setItemOpen(!itemOpen);
          }
        }}
      >
        <div className={styles.SidebarArea__Menu__SelectableMenuItem__Icon}>
          {icon}
        </div>
        <div
          className={
            styles.SidebarArea__Menu__SelectableMenuItem__TextContainer
          }
          style={{
            justifyContent: isCollapsed ? 'center' : 'space-between',
            marginTop: isCollapsed ? '5px' : '0px',
          }}
        >
          <Typography
            className={
              styles.SidebarArea__Menu__SelectableMenuItem__TextContainer__Text
            }
            fontSize={'S'}
          >
            {isCollapsed || mobile ? collapsedTitle : title}
          </Typography>
          {isCollapsed ? null : (
            <motion.div
              className={styles.SidebarArea__Menu__SelectableMenuItem__Dropdown}
              variants={triangleVariants}
              transition={{ duration: 0.2 }}
              animate={triangleController}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 20 20"
                style={{ color: 'white' }}
              >
                <path d="M0 7 L 20 7 L 10 16" />
              </svg>
            </motion.div>
          )}
        </div>
      </div>
      <motion.ul
        className={styles.SidebarArea__Menu__List}
        variants={listVariants}
        animate={listController}
      >
        {subItems.map((slug, idx) => {
          return (
            <SubItem
              key={slug}
              slug={slug}
              idx={idx}
              selected={selected}
              setSelected={setSelected}
              itemOpen={itemOpen}
            ></SubItem>
          );
        })}
      </motion.ul>
    </div>
  );
};
