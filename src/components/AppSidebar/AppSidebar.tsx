import { useState, useRef } from 'react';
import { ProSidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
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
import LinkIcon from '@mui/icons-material/Link';
import styles from './app_sidebar.module.scss';
import { pages } from '../../pages/samples/[slug]';
import { motion } from 'framer-motion';

type ItemProps = {
  title: string;
  collapsedTitle?: string;
  to: any;
  icon: any;
  selected: any;
  setSelected: any;
  isCollapsed: boolean;
};

const Item = ({
  title,
  collapsedTitle,
  to,
  icon,
  selected,
  setSelected,
  isCollapsed,
}: ItemProps) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  if (!collapsedTitle) {
    collapsedTitle = title;
  }

  const ref = useRef<HTMLLIElement>(null);

  const whenMouseMove = (e: React.MouseEvent) => {
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
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCollapsed ? '' : '20% 80%',
          gridTemplateRows: isCollapsed ? '60% 40%' : '',
          flexDirection: isCollapsed ? 'column' : 'row',
          width: 'inherit',
          color: 'white',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
        >
          <Typography fontSize={'S'}>{isCollapsed ? collapsedTitle : title}</Typography>
        </div>
      </div>
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
                {isCollapsed ? 'Shaders' : 'Shader Examples'}
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
              />
              <Item
                title={'Vertex Shaders'}
                collapsedTitle={'Vertex'}
                to="/lc_slice/linked_lists"
                icon={<ShareIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
              />
              <Item
                title="Hash Tables"
                to="/lc_slice/hash_tables"
                icon={<TocIcon fontSize="large"/>}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
              />
            </div>
            <Typography
              variant="h6"
              color={colors.grey[900]}
              sx={{ m: '15px 0 5px 20px' }}
            >
              Pages
            </Typography>
            <div className={styles.SidebarArea__SelectableMenuArea}>
              <Item
                title="FAQ Page"
                to="/problem_container"
                icon={<HelpOutlineOutlinedIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
              />
              <Item
                title="Github Page"
                to="https://github.com/cmhhelgeson/lc_slice/tree/master/frontend"
                icon={<GitHubIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
              />
              <Item
                title="Linkedin Page"
                to="https://www.linkedin.com/in/christian-helgeson-02994b126/"
                icon={<LinkedInIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
              />
              <Item
                to="https://letterboxd.com/chrishelgie/"
                title="Letterboxd Page"
                icon={<MoreHorizIcon fontSize="large" />}
                selected={selected}
                setSelected={setSelected}
              />
            </div>
          </Box>
        </Menu>
      </ProSidebar>
    </Box>
  );
};

export default AppSidebar;
