import {
  useState,
  useEffect,
  PropsWithChildren,
  Dispatch,
  SetStateAction,
} from 'react';
import { motion, useAnimation } from 'framer-motion';
import { ProSidebar, Menu } from 'react-pro-sidebar';
import { Box, IconButton, useTheme } from '@mui/material';
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
import {
  fragmentPages,
  vertexPages,
  computePages,
} from '../../pages/samples/[slug]';
import { Item } from './Item';

interface NavContainerProps {
  mobile: boolean;
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
}

const NavContainer = ({
  children,
  mobile,
  isCollapsed,
  setIsCollapsed,
}: PropsWithChildren<NavContainerProps>) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const headerController = useAnimation();

  if (mobile) {
    return (
      <div style={{ display: 'flex', backgroundColor: colors.primary[400] }}>
        <div
          className={styles.SidebarArea__BurgerArea}
          style={{
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {children}
          <IconButton
            onClick={() => {
              if (!isCollapsed) {
                headerController.start({
                  opacity: [1, 0],
                  translateX: [0, -20],
                  transition: {
                    duration: 0.3,
                  },
                });
                setIsCollapsed(!isCollapsed);
              } else {
                headerController.start({
                  opacity: [0, 1],
                  translateX: [-20, 0],
                  transition: {
                    opacity: { duration: 0.3, ease: 'easeIn' },
                    translateX: {
                      duration: 0.3,
                      type: 'spring',
                      stiffness: 800,
                      damping: 10,
                    },
                  },
                });
                setIsCollapsed(!isCollapsed);
              }
            }}
          >
            <MenuOutlinedIcon fontSize="large" />
          </IconButton>
        </div>
      </div>
    );
  } else {
    return (
      <Box
        display="flex"
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
              <h1 className={styles.SidebarArea__BurgerArea__BurgerText}>
                WGSL Shader Depot
              </h1>
            )}
            <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
              <MenuOutlinedIcon fontSize="large" />
            </IconButton>
          </div>
          {children}
        </ProSidebar>
      </Box>
    );
  }
};

interface ItemsContainerProps {
  selected: string;
  setSelected: Dispatch<SetStateAction<string>>;
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
  fragmentNames: string[];
  vertexNames: string[];
  computeNames: string[];
  mobile: boolean;
}

const MobileItemsContainer = ({
  selected,
  setSelected,
  isCollapsed,
  setIsCollapsed,
  fragmentNames,
  vertexNames,
  computeNames,
  mobile,
}: ItemsContainerProps) => {
  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        justifyContent: 'space-evenly',
      }}
    >
      <Item
        title={'Fragment Shaders'}
        collapsedTitle={'Fragment'}
        icon={<AppsIcon fontSize="large" />}
        selected={selected}
        setSelected={setSelected}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        subItems={fragmentNames}
        mobile={mobile}
      />
      <Item
        title={'Vertex Shaders'}
        collapsedTitle={'Vertex'}
        icon={<ShareIcon fontSize="large" />}
        selected={selected}
        setSelected={setSelected}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        subItems={vertexNames}
        mobile={mobile}
      />
      <Item
        title="Compute Shaders"
        collapsedTitle="Compute"
        icon={<TocIcon fontSize="large" />}
        selected={selected}
        setSelected={setSelected}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        subItems={computeNames}
        mobile={mobile}
      />
    </div>
  );
};

const DesktopItemsContainer = ({
  selected,
  setSelected,
  isCollapsed,
  setIsCollapsed,
  fragmentNames,
  vertexNames,
  computeNames,
  mobile,
}: ItemsContainerProps) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <Menu iconShape="square">
      <Box>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'white', textShadow: '1px 1px 1px black' }}>
            {isCollapsed ? 'Examples' : 'Shader Examples'}
          </div>
        </div>

        <div className={styles.SidebarArea__Menu}>
          <Item
            title={'Fragment Shaders'}
            collapsedTitle={'Fragment'}
            icon={<AppsIcon fontSize="large" />}
            selected={selected}
            setSelected={setSelected}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            subItems={fragmentNames}
            mobile={mobile}
          />
          <Item
            title={'Vertex Shaders'}
            collapsedTitle={'Vertex'}
            icon={<ShareIcon fontSize="large" />}
            selected={selected}
            setSelected={setSelected}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            subItems={vertexNames}
            mobile={mobile}
          />
          <Item
            title="Compute Shaders"
            collapsedTitle="Compute"
            icon={<TocIcon fontSize="large" />}
            selected={selected}
            setSelected={setSelected}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            subItems={computeNames}
            mobile={mobile}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'white', textShadow: '1px 1px 1px black' }}>
            {isCollapsed ? 'Links' : 'Outside Links'}
          </div>
        </div>
        <div className={styles.SidebarArea__Menu}>
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
  );
};

const AppSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobile, setMobile] = useState<boolean>(false);
  const [selected, setSelected] = useState<string>('Dashboard');
  const fragmentNames = Object.keys(fragmentPages);
  const vertexNames = Object.keys(vertexPages);
  const computeNames = Object.keys(computePages)

  useEffect(() => {
    const resizeListener = () => {
      if (window.innerWidth < 768) {
        setMobile(true);
      } else {
        setMobile(false);
      }
    };
    window.addEventListener('resize', resizeListener);

    return () => {
      window.removeEventListener('resize', resizeListener);
    };
  }, []);

  return (
    <NavContainer
      mobile={mobile}
      isCollapsed={isCollapsed}
      setIsCollapsed={setIsCollapsed}
    >
      {mobile ? (
        <MobileItemsContainer
          selected={selected}
          setSelected={setSelected}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          fragmentNames={fragmentNames}
          vertexNames={vertexNames}
          computeNames={computeNames}
          mobile={mobile}
        />
      ) : (
        <DesktopItemsContainer
          selected={selected}
          setSelected={setSelected}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          fragmentNames={fragmentNames}
          vertexNames={vertexNames}
          computeNames={computeNames}
          mobile={mobile}
        />
      )}
    </NavContainer>
  );
};

export default AppSidebar;
