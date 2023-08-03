import { useState, useRef, useEffect, SetStateAction, Dispatch } from 'react';
import { ProSidebar, Menu } from 'react-pro-sidebar';
import Link from 'next/link';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import 'react-pro-sidebar/dist/css/styles.css';
import { tokens } from './theme';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import AppsIcon from '@mui/icons-material/Apps';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ShareIcon from '@mui/icons-material/Share';
import TocIcon from '@mui/icons-material/Toc';
import styles from './app_sidebar.module.scss';
import { pages } from '../../pages/samples/[slug]';
import { fragmentPages, vertexPages } from '../../pages/samples/[slug]';
import { motion, useAnimation } from 'framer-motion';
import {
  triangleVariants,
  AnimationKeysType,
  listVariants,
  listItemVariants,
} from './AppSidebarTypes';
import { useImmer } from 'use-immer';
import { useRouter } from 'next/router';

/*const whenMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) {
      return;
    }
    const decimal = e.clientX / ref.current.offsetWidth;
    const basePercent = -100,
      percentRange = 200;
    const adjustablePercent = percentRange * decimal;
    const lightBluePercent = basePercent + adjustablePercent;
    ref.current.style.setProperty(
      '--light_blue_percent',
      `${lightBluePercent}%`
    );
  }; */

type ItemProps = {
  title: string;
  collapsedTitle?: string;
  to: any;
  icon: any;
  selected: any;
  setSelected: any;
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
  subItems: string[];
};

type SubItemProps = {
  slug: string;
  idx: number;
  itemOpen: boolean;
};

const SubItem = ({ slug, idx, itemOpen }: SubItemProps) => {
  const router = useRouter();
  const itemController = useAnimation();
  return (
    <motion.li
      key={slug}
      className={styles.SidebarArea__Menu__List__ListItem}
      variants={listItemVariants}
      onClick={() => {
        if (itemOpen) {
          router.push(`/samples/${slug}`);
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
        }}
      >
        <div className={styles.SidebarArea__Menu__List__ListItem__Number}>
          {`${idx + 1}.`}
        </div>
        <motion.div className={styles.SidebarArea__Menu__List__ListItem__Text}>
          {`${slug}`}
        </motion.div>
      </div>
    </motion.li>
  );
};

const Item = ({
  title,
  collapsedTitle,
  icon,
  isCollapsed,
  setIsCollapsed,
  subItems,
}: ItemProps) => {
  if (!collapsedTitle) {
    collapsedTitle = title;
  }

  const router = useRouter();

  const [animationKeys, setAnimationKeys] = useImmer<AnimationKeysType>({
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

  const ref = useRef<HTMLLIElement>(null);

  return (
    <div className={styles.SidebarArea__Menu__SelectableMenuItem}>
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
          <Typography fontSize={'S'}>
            {isCollapsed ? collapsedTitle : title}
          </Typography>
          {isCollapsed ? null : (
            <motion.div
              className={styles.SidebarArea__Menu__SelectableMenuItem__Dropdown}
              variants={triangleVariants}
              transition={{ duration: 0.2 }}
              animate={triangleController}
              onClick={() => {
                setItemOpen(!itemOpen);
                setAnimationKeys((draft) => {
                  if (draft.triangle === 'close' || draft.triangle === '') {
                    draft.triangle = 'open';
                  } else {
                    draft.triangle = 'close';
                  }
                  return draft;
                });
              }}
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
          return (<SubItem slug={slug} idx={idx} isOpen={isOpen}></SubItem>;
        })}
      </motion.ul>
    </div>
  );
};

/*type SidebarProps = {
  isSidebar: boolean;
}; */

const AppSidebar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [selected, setSelected] = useState<string>('Dashboard');
  const sideBarRef = useRef<HTMLDivElement>(null);
  const fragmentNames = Object.keys(fragmentPages);
  const vertexNames = Object.keys(vertexPages);
  const router = useRouter();

  return (
    <Box
      display="flex"
      ref={sideBarRef}
      sx={{
        '& .pro-sidebar-inner': {
          background: `${colors.primary[400]} !important`,
        },
        '& .pro-icon-wrapper': {
          backgroundColor: 'transparent !important',
        },
        '& .pro-inner-item': {
          padding: '5px 35px 5px 20px !important',
        },
        '& .pro-inner-item:hover': {
          color: '#fff !important',
        },
        '& .pro-menu-item.active': {
          color: '#6870fa !important',
        },
      }}
    >
      <ProSidebar collapsed={isCollapsed}>
        <div
          className={styles.SidebarArea__BurgerArea}
          style={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}
        >
          {isCollapsed ? null : (
            <div className={styles.SidebarArea__BurgerArea__BurgerText}>
              WGSL Shader Depot
            </div>
          )}
          <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
            <MenuOutlinedIcon fontSize="large" />
          </IconButton>
        </div>
        <Menu iconShape="square">
          <Box>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div color={colors.grey[900]}>
                {isCollapsed ? 'Examples' : 'Shader Examples'}
              </div>
            </div>

            <div className={styles.SidebarArea__SelectableMenuArea}>
              <Item
                title={'Fragment Shaders'}
                collapsedTitle={'Fragment'}
                to="/lc_slice/grids"
                icon={<AppsIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                subItems={fragmentNames}
              />
              <Item
                title={'Vertex Shaders'}
                collapsedTitle={'Vertex'}
                to="/lc_slice/linked_lists"
                icon={<ShareIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                subItems={vertexNames}
              />
              <Item
                title="Compute Shaders"
                collapsedTitle="Compute"
                to="/lc_slice/hash_tables"
                icon={<TocIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                subItems={[]}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div color={colors.grey[900]}>
                {isCollapsed ? 'Examples' : 'Shader Examples'}
              </div>
            </div>
            <div className={styles.SidebarArea__SelectableMenuArea}>
              <Item
                title="FAQ Page"
                collapsedTitle="FAQ"
                to="/problem_container"
                isCollapsed={isCollapsed}
                icon={<HelpOutlineOutlinedIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
                setIsCollapsed={setIsCollapsed}
                subItems={[]}
              />
              <Item
                title="Github Page"
                collapsedTitle="Github"
                isCollapsed={isCollapsed}
                to="https://github.com/cmhhelgeson/lc_slice/tree/master/frontend"
                icon={<GitHubIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
                setIsCollapsed={setIsCollapsed}
                subItems={[]}
              />
              <Item
                title="Linkedin Page"
                collapsedTitle="Linkedin"
                isCollapsed={isCollapsed}
                to="https://www.linkedin.com/in/christian-helgeson-02994b126/"
                icon={<LinkedInIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
                setIsCollapsed={setIsCollapsed}
                subItems={[]}
              />
              <Item
                to="https://letterboxd.com/chrishelgie/"
                title="Letterboxd Page"
                collapsedTitle="Letterboxd"
                isCollapsed={isCollapsed}
                icon={<MoreHorizIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
                setIsCollapsed={setIsCollapsed}
                subItems={[]}
              />
            </div>
          </Box>
        </Menu>
      </ProSidebar>
    </Box>
  );
};

export default AppSidebar;
