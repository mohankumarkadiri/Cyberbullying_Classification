import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import CameraEnhanceIcon from '@mui/icons-material/CameraEnhance';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import CustomTooltip from '../common/CustomTooltip';
import assets from '../assets';
import './SideBar.css';


const SideBar = ({ onToggle }) => {

    const [sideBarOpen, setSideBarOpen] = useState(false);

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
                        <span className="college">VIEW</span>
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
            </div>
        </nav>
    );
}

export default SideBar;