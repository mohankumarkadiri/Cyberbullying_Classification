import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/joy';
import ErrorBoundary from './common/ErrorBoundary';
import SideBar from './components/SideBar';
import Header from './components/Header';


const Layout = () => {
    const [sideBarOpen, setSideBarOpen] = useState(false);

    return (
        <Box>
            <ErrorBoundary>
                <div className='layout-container'>
                    <SideBar onToggle={() => setSideBarOpen(value => !value)} />
                    <div className={`main ${sideBarOpen ? '' : 'sideBarClosed'}`}>
                        <Header />
                        <div className="content">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </ErrorBoundary>
        </Box>
    );
};

export default Layout;