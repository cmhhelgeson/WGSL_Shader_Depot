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
import { setItemOpenIndex } from '../../features/itemOpen/itemOpenSlice';
import { useAppDispatch, useAppSelector } from '../../features/store';

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
  itemIndex: number;
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
  itemIndex,
}: ItemProps) => {
  if (!collapsedTitle) {
    collapsedTitle = title;
  }

  const dispatch = useAppDispatch();
  const itemOpenIndex = useAppSelector((state) => state.itemOpen);

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

  if (!mobile || itemOpenIndex === -1 || itemOpenIndex === itemIndex) {
    return (
      <div
        className={styles.SidebarArea__Menu__SelectableMenuItem}
        style={{
          alignItems: mobile ? 'center' : 'flex-start',
        }}
        onClick={() => {
          if (!itemOpen) {
            setItemOpen(true);
            dispatch(setItemOpenIndex({ index: itemIndex }));
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
          style={
            !mobile
              ? {
                  gridTemplateColumns: isCollapsed ? '' : '20% 80%',
                  gridTemplateRows: isCollapsed ? '60% 40%' : '',
                  flexDirection: isCollapsed ? 'column' : 'row',
                }
              : {
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                }
          }
          onClick={() => {
            if (!itemOpen && isCollapsed === true) {
              setItemOpen(true);
              dispatch(setItemOpenIndex({ index: itemIndex }));
              setIsCollapsed(false);
            }
            if (itemOpen) {
              setItemOpen(false);
              dispatch(setItemOpenIndex({ index: -1 }));
              setAnimationKeys((draft) => {
                draft.triangle = 'close';
                return draft;
              });
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
            style={
              mobile
                ? {
                    justifyContent: 'space-between',
                  }
                : {
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    marginTop: isCollapsed ? '5px' : '0px',
                  }
            }
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
                className={
                  styles.SidebarArea__Menu__SelectableMenuItem__Dropdown
                }
                style={{
                  marginLeft: mobile ? '5px' : '0px',
                }}
                variants={triangleVariants}
                transition={{ duration: 0.2 }}
                animate={triangleController}
              >
                <svg width="15" height="15" viewBox="0 0 20 20">
                  <path d="M0 7 L 20 7 L 10 16" fill="white" />
                </svg>
              </motion.div>
            )}
          </div>
        </div>
        {mobile && !itemOpen ? null : (
          <motion.ul
            className={
              mobile
                ? styles.SidebarArea__Menu__MobileList
                : styles.SidebarArea__Menu__List
            }
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
                  mobile={mobile}
                ></SubItem>
              );
            })}
          </motion.ul>
        )}
      </div>
    );
  } else {
    return null;
  }
};
