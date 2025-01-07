import React, { useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box,
    Typography,
    TextField,
    Paper,
    IconButton,
    CircularProgress,
    Grid
} from '@mui/material';
import {
    CloudUpload,
    Send
} from '@mui/icons-material';
import { TypeAnimation } from 'react-type-animation';
import { useSnackbar } from '../hooks/SnackBarProvider';
import { useDispatch } from 'react-redux';
import { setCurrentPage } from '../store/authSlice';
import axios from 'axios';

const FileUploadUI = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [text, setText] = useState('');
    const [prediction, setPrediction] = useState('');
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadType, setUploadType] = useState('file');

    const openSnackbar = useSnackbar();
    const dispatch = useDispatch();


    useLayoutEffect(() => {
        dispatch(setCurrentPage('Cyberbullying Detection'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDrag = (e) => {
        e.preventDefault();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setDragActive(false);
        const files = e.dataTransfer.files;
        if (files?.[0]) await handleFile(files[0]);
    };

    const handleFile = async (file) => {
        setFile(file);

        if (file.type.startsWith('image/') ||
            file.type.startsWith('video/') ||
            file.type.startsWith('audio/')) {
            const url = URL.createObjectURL(file);
            setPreview(url);
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:17291/api/predict', formData);
            setPrediction(response?.data?.predicted_label);
        } catch (error) {
            openSnackbar(error?.response?.data?.message || error?.response?.status, 'danger');
            console.log('Error:', error);
        }
        setLoading(false);
    };

    const handleTextSubmit = async () => {
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:17291/api/predict', { text });
            setPrediction(response?.data?.predicted_label);
        } catch (error) {
            openSnackbar(error?.response?.data?.message || error?.response?.status, 'danger');
            console.log('Error:', error);
        }
        setLoading(false);
    };

    const renderPreview = () => {
        if (!preview) return null;

        if (file.type.startsWith('image/')) {
            return (
                <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded-lg"
                    style={{ width: '300px' }}
                />
            );
        } else if (file.type.startsWith('video/')) {
            return (
                <video
                    src={preview}
                    controls
                    className="w-full max-h-64 rounded-lg"
                    width={600}
                />
            );
        } else if (file.type.startsWith('audio/')) {
            return (
                <audio
                    src={preview}
                    controls
                    className="w-full"
                />
            );
        }
        return null;
    };

    return (
        <Box sx={{
            minHeight: '100%',
            padding: 4,
            background: 'var(--body-color)',
            color: 'var(--text-color)'
        }}>
            <Typography
                variant="h3"
                align="center"
                sx={{
                    color: 'var(--primary-color)',
                    marginBottom: 4,
                    fontWeight: 'bold'
                }}
            >
                <TypeAnimation
                    sequence={[
                        'Cyberbullying Detection',
                        1000,
                        'Upload Files',
                        1000,
                        'Process Text',
                        1000
                    ]}
                    repeat={Infinity}
                />
            </Typography>

            <Grid container spacing={3} sx={{ maxWidth: '100%', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Grid item sx={{ width: '50%' }}>
                    <Box sx={{ marginBottom: 3 }}>
                        <Box sx={{
                            display: 'flex',
                            gap: 2,
                            justifyContent: 'center',
                            marginBottom: 3
                        }}>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setUploadType('file')}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: uploadType === 'file' ? 'var(--primary-color)' : 'var(--primary-color-light)',
                                    color: 'var(--secondary-color)',
                                    cursor: 'pointer'
                                }}
                            >
                                File Upload
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setUploadType('text')}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: uploadType === 'text' ? 'var(--primary-color)' : 'var(--primary-color-light)',
                                    color: 'var(--secondary-color)',
                                    cursor: 'pointer'
                                }}
                            >
                                Text Input
                            </motion.button>
                        </Box>

                        <AnimatePresence mode="wait">
                            {uploadType === 'file' ? (
                                <motion.div
                                    key="file-upload"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <Paper
                                        elevation={dragActive ? 24 : 6}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        sx={{
                                            p: 4,
                                            textAlign: 'center',
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            background: 'var(--bg-color)',
                                            boxShadow: `0 4px 6px var(--shadow-color)`,
                                            transform: dragActive ? 'scale(1.02)' : 'scale(1)',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <input
                                            type="file"
                                            id="file-upload"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFile(e.target.files[0])}
                                            accept="image/*,video/*,audio/*"
                                        />
                                        <label htmlFor="file-upload">
                                            <motion.div
                                                whileHover={{ scale: 1.1, rotate: 5 }}
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <IconButton component="span" size="large">
                                                    <CloudUpload sx={{
                                                        fontSize: 60,
                                                        color: 'var(--primary-color)'
                                                    }} />
                                                </IconButton>
                                            </motion.div>
                                        </label>
                                        <Typography variant="h6">
                                            Drag & Drop or Click to Upload
                                        </Typography>
                                    </Paper>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="text-input"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <Paper sx={{
                                        p: 4,
                                        background: 'var(--bg-color)',
                                        boxShadow: `0 4px 6px var(--shadow-color)`
                                    }}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={4}
                                            color='success'
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            placeholder="Enter your text here..."
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '& fieldset': {
                                                        borderColor: 'var(--primary-color-light)'
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'var(--primary-color)'
                                                    }
                                                }
                                            }}
                                        />
                                        <motion.div
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            style={{
                                                marginTop: '16px',
                                                display: 'flex',
                                                justifyContent: 'flex-end'
                                            }}
                                        >
                                            <IconButton
                                                onClick={handleTextSubmit}
                                                sx={{
                                                    color: 'var(--primary-color)',
                                                    '&:hover': {
                                                        background: 'var(--primary-color-light)'
                                                    }
                                                }}
                                            >
                                                <Send />
                                            </IconButton>
                                        </motion.div>
                                    </Paper>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Box>

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginTop: 20
                            }}
                        >
                            <CircularProgress sx={{ color: 'var(--primary-color)' }} />
                        </motion.div>
                    )}

                    <AnimatePresence>
                        {!loading && prediction && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <Paper sx={{
                                    p: 3,
                                    background: 'var(--bg-color)',
                                    boxShadow: `0 4px 6px var(--shadow-color)`
                                }}>
                                    <Typography variant="h6" color="var(--primary-color)">
                                        Prediction:
                                    </Typography>
                                    <Typography>{prediction}</Typography>
                                </Paper>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Grid>

                {preview && (<Grid item sx={{ width: '50%' }}>
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <Paper
                                sx={{
                                    p: 3,
                                    background: 'var(--bg-color)',
                                    boxShadow: `0 4px 6px var(--shadow-color)`
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: 'var(--primary-color)',
                                        marginBottom: 2
                                    }}
                                >
                                    Preview
                                </Typography>
                                {renderPreview()}
                            </Paper>
                        </motion.div>
                    </AnimatePresence>
                </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default FileUploadUI;