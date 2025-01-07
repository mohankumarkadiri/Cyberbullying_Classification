import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import CameraEnhanceIcon from '@mui/icons-material/CameraEnhance';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CustomTooltip from '../common/CustomTooltip';
import assets from '../assets';
import { logout } from '../store/authSlice';
import { useSnackbar } from '../hooks/SnackBarProvider';
import ConfirmationSnackBar from '../common/ConfirmationSnackBar';
import axios from 'axios';
import config from '../config';
import './SideBar.css';


const SideBar = ({ onToggle }) => {

    const [sideBarOpen, setSideBarOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const openSnackBar = useSnackbar();
    const dispatch = useDispatch();

    const userInfo = useSelector(state => state.auth.userInfo);
    const isAdmin = userInfo?.role === 'admin';

    const pages = [
        {
            name: 'Detection',
            tooltip: 'Cyberbullying Detection',
            icon: CameraEnhanceIcon,
            link: 'fileUpload'
        },
        {
            name: 'Text Extraction',
            tooltip: 'Text Extraction from file',
            icon: ImageSearchIcon,
            link: 'textExtraction'
        },
    ];



    const handleToggle = () => {
        setSideBarOpen(value => !value);
        onToggle();
    }

    const onLogoutResponse = async (wantLogout) => {
        setOpen(false);
        if (!wantLogout)
            return
        openSnackBar('Logging Out...');
        try {
            await axios.delete(`${config.SERVER_BASE_ADDRESS}/auth/logout`, { withCredentials: true });
            openSnackBar('Logged Out Successfully!', 'success');
            dispatch(logout());
            window.location.href = '/login';
        } catch (err) {
            console.log(err);
            openSnackBar('Error occurred while Logging Out, please try again', 'danger');
        }
    }

    return (
        <nav className={`sidebar ${sideBarOpen ? '' : 'close'}`}>
            <header>
                <div className="image-text">
                    <Link to='/' style={{
                        textDecoration: 'none'
                    }}>
                        <span className="image">
                            <img className="image" src={assets.kid} alt='' />
                        </span>
                    </Link>
                    <div className="text logo-text">
                        <span className="name">Cyber Space</span>
                        <span className="college">College</span>
                    </div>
                </div>
                <ChevronRightOutlined className='toggle' onClick={handleToggle} />
            </header>
            <div className="menu-bar">
                <div className="menu">
                    <ul className="menu-links">
                        {pages.map((page, index) => (
                            <CustomTooltip key={index} title={!sideBarOpen && page.tooltip}>
                                <li className="nav-link">
                                    <Link to={page.link}>
                                        <page.icon className='mui--icon' />
                                        <span className="text nav-text">{page.name}</span>
                                    </Link>
                                </li>
                            </CustomTooltip>
                        ))}
                    </ul>
                </div>

                <div className="bottom-content">
                    {
                        isAdmin
                        &&
                        <CustomTooltip title={!sideBarOpen && "Users"}>
                            <li className='nav-link'>
                                <Link to='users'>
                                    <GroupRoundedIcon className='mui--icon' />
                                    <span className="text nav-text">Users</span>
                                </Link>
                            </li>
                        </CustomTooltip>
                    }
                    {
                        isAdmin
                        &&
                        <CustomTooltip title={!sideBarOpen && "User Requests"}>
                            <li className='nav-link'>
                                <Link to='UserRequests'>
                                    <HowToRegIcon className='mui--icon' />
                                    <span className="text nav-text">User Requests</span>
                                </Link>
                            </li>
                        </CustomTooltip>
                    }
                    <CustomTooltip title={!sideBarOpen && "Logout"}>
                        <li className='logout-btn' onClick={() => setOpen(true)} style={{ cursor: 'pointer' }}>
                            <LogoutOutlinedIcon className='mui--icon' />
                            <span className="text nav-text">Logout</span>
                        </li>
                    </CustomTooltip>
                </div>
            </div>

            <ConfirmationSnackBar
                open={open}
                onClose={() => setOpen(false)}
                message='Do you want to Log out?'
                onResponse={onLogoutResponse}
            />
        </nav>
    );
}

export default SideBar;