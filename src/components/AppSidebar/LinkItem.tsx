import { useState, useRef, useEffect, SetStateAction, Dispatch } from 'react';
import { Typography } from '@mui/material';
import 'react-pro-sidebar/dist/css/styles.css';
import styles from './app_sidebar.module.scss';

interface LinkItemProps {
  title: string;
  collapsedTitle?: string;
  icon: any;
  to?: string;
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
  mobile?: boolean;
}

export const LinkItem = ({
  title,
  collapsedTitle,
  icon,
  isCollapsed,
  mobile,
  to,
}: LinkItemProps) => {
  if (!collapsedTitle) {
    collapsedTitle = title;
  }

  const itemRef = useRef<HTMLDivElement>(null);

  const [itemOpen, setItemOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isCollapsed) {
      setItemOpen(false);
    }
  }, [isCollapsed]);

  return (
    <div
      className={styles.SidebarArea__Menu__SelectableMenuItem}
      style={{
        alignItems: mobile ? 'center' : 'flex-start',
      }}
      onClick={() => {
        if (!itemOpen) {
          setItemOpen(true);
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
          window.location.href = to;
          if (!itemOpen && isCollapsed === true) {
            setItemOpen(true);
          }
          if (itemOpen) {
            setItemOpen(false);
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
        </div>
      </div>
    </div>
  );
};
