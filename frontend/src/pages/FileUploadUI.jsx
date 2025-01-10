import React, { useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box,
    Typography,
    TextField,
    Paper,
    IconButton,
    Grid,
    LinearProgress,
    Alert,
    AlertTitle,
    Tooltip,
    useTheme,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    CloudUpload,
    Send,
    Close,
    Image,
    VideoFile,
    AudioFile,
    Refresh,
    InfoOutlined,
    Check,
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
    const [error, setError] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    // eslint-disable-next-line no-unused-vars
    const [processingHistory, setProcessingHistory] = useState([]);
    const [showHelp, setShowHelp] = useState(false);

    const theme = useTheme();
    const openSnackbar = useSnackbar();
    const dispatch = useDispatch();

    useLayoutEffect(() => {
        dispatch(setCurrentPage('Cyberbullying Detection'));
    }, [dispatch]);

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: "easeOut" }
        },
        exit: {
            opacity: 0,
            y: -20,
            transition: { duration: 0.3 }
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                delayChildren: 0.3,
                staggerChildren: 0.2
            }
        }
    };

    const validateFile = (file) => {
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (file.size > maxSize) {
            setError('File size exceeds 10MB limit');
            return false;
        }

        return true;
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === "dragenter" || e.type === "dragover");
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files?.[0] && validateFile(files[0])) {
            await handleFile(files[0]);
        }
    };

    const handleFile = async (file) => {
        setFile(file);
        setError(null);
        setUploadProgress(0);

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
            const response = await axios.post('http://localhost:17291/api/predict', formData, {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            });

            const result = response?.data?.predicted_label;
            setPrediction(result);
            setProcessingHistory(prev => [...prev, {
                type: 'file',
                name: file?.name,
                result,
                timestamp: new Date().toISOString()
            }]);

            openSnackbar('Analysis complete!', 'success');
        } catch (error) {
            setError(error?.response?.data?.message || 'Processing failed');
            openSnackbar(error?.response?.data?.message || 'Error', 'danger');
        }
        setLoading(false);
    };

    const handleTextSubmit = async () => {
        if (!text.trim()) {
            setError('Please enter text to analyze');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('http://localhost:17291/api/predict', { text });
            const result = response?.data?.predicted_label;
            setPrediction(result);

            setProcessingHistory(prev => [...prev, {
                type: 'text',
                content: text.substring(0, 50) + '...',
                result,
                timestamp: new Date().toISOString()
            }]);

            openSnackbar('Analysis complete!', 'success');
        } catch (error) {
            setError(error?.response?.data?.message || 'Analysis failed');
            openSnackbar(error?.response?.data?.message || 'Error', 'danger');
        }
        setLoading(false);
    };

    const renderFileIcon = (fileType) => {
        if (fileType?.startsWith('image/')) return <Image sx={{ fill: 'white' }} />;
        if (fileType?.startsWith('video/')) return <VideoFile sx={{ fill: 'white' }} />;
        if (fileType?.startsWith('audio/')) return <AudioFile sx={{ fill: 'white' }} />;
        return <CloudUpload sx={{ fill: 'white' }} />;
    };

    const renderPreview = () => {
        if (!preview) return null;

        if (file.type.startsWith('image/')) {
            return (
                <motion.img
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={preview}
                    alt="Preview"
                    style={{
                        width: '100%',
                        maxHeight: '300px',
                        objectFit: 'contain',
                        borderRadius: '8px'
                    }}
                />
            );
        } else if (file.type.startsWith('video/')) {
            return (
                <motion.video
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={preview}
                    controls
                    style={{
                        width: '100%',
                        maxHeight: '300px',
                        borderRadius: '8px'
                    }}
                />
            );
        } else if (file.type.startsWith('audio/')) {
            return (
                <motion.audio
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={preview}
                    controls
                    style={{ width: '100%' }}
                />
            );
        }
        return null;
    };

    return (
        <Box sx={{
            height: '100%',
            padding: theme.spacing(4),
            color: theme.palette.success.main
        }}>
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <Typography
                    variant="h2"
                    align="center"
                    sx={{
                        marginBottom: theme.spacing(6),
                        fontWeight: 700,
                        position: 'relative'
                    }}
                >
                    <TypeAnimation
                        sequence={[
                            'Cyberbullying Detection',
                            2000,
                            'Internet Analysis',
                            2000,
                            'Cyber Safe',
                            2000
                        ]}
                        repeat={Infinity}
                    />
                    <Tooltip title="Learn more about our detection system" arrow>
                        <IconButton
                            sx={{ position: 'absolute', right: -40, top: 0 }}
                            onClick={() => setShowHelp(true)}
                        >
                            <InfoOutlined />
                        </IconButton>
                    </Tooltip>
                </Typography>

                <Grid container spacing={4} justifyContent="center">
                    <Grid item xs={12} md={8}>
                        <Paper
                            elevation={3}
                            sx={{
                                p: 3,
                                mb: 4,
                                background: theme.palette.grey[50],
                                borderRadius: 2
                            }}
                        >
                            <Grid container spacing={2} justifyContent="center">
                                <Grid item>
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                            variant={uploadType === 'file' ? 'contained' : 'outlined'}
                                            onClick={() => setUploadType('file')}
                                            startIcon={<CloudUpload />}
                                            color='success'
                                        >
                                            File Upload
                                        </Button>
                                    </motion.div>
                                </Grid>
                                <Grid item>
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                            variant={uploadType === 'text' ? 'contained' : 'outlined'}
                                            onClick={() => setUploadType('text')}
                                            startIcon={<Send />}
                                            color='success'
                                        >
                                            Text Input
                                        </Button>
                                    </motion.div>
                                </Grid>
                            </Grid>
                        </Paper>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={uploadType}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                variants={fadeInUp}
                            >
                                <Paper
                                    elevation={dragActive ? 8 : 3}
                                    sx={{
                                        p: 4,
                                        background: theme.palette.grey[50],
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                        border: dragActive
                                            ? `2px dashed ${theme.palette.success.main}`
                                            : '2px solid transparent'
                                    }}
                                >
                                    {uploadType === 'file' ? (
                                        <Box
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                            sx={{
                                                textAlign: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <input
                                                type="file"
                                                id="file-upload"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file && validateFile(file)) {
                                                        handleFile(file);
                                                    }
                                                }}
                                                accept="image/*,video/*,audio/*"
                                            />
                                            <label htmlFor="file-upload">
                                                <motion.div
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <IconButton
                                                        component="span"
                                                        sx={{
                                                            width: 80,
                                                            height: 80,
                                                            backgroundColor: theme.palette.success.main,
                                                            '&:hover': {
                                                                backgroundColor: theme.palette.success.dark
                                                            }
                                                        }}
                                                    >
                                                        {renderFileIcon(file?.type)}
                                                    </IconButton>
                                                </motion.div>
                                            </label>
                                            <Typography variant="h6" sx={{ mt: 2 }}>
                                                {dragActive
                                                    ? 'Drop your file here'
                                                    : 'Drag & Drop or Click to Upload'}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                                Supports images, videos, and audio files up to 10MB
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Box>
                                            <TextField
                                                fullWidth
                                                multiline
                                                color='warning'
                                                rows={4}
                                                value={text}
                                                onChange={(e) => setText(e.target.value)}
                                                placeholder="Enter your text for analysis..."
                                                variant="outlined"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        '& fieldset': {
                                                            borderColor: theme.palette.warning.main
                                                        },
                                                        '&:hover fieldset': {
                                                            borderColor: theme.palette.warning.dark
                                                        }
                                                    }
                                                }}
                                            />
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                                <motion.div
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <Button
                                                        variant="contained"
                                                        color='success'
                                                        onClick={handleTextSubmit}
                                                        startIcon={<Send />}
                                                        disabled={loading || !text.trim()}
                                                    >
                                                        Analyze
                                                    </Button>
                                                </motion.div>
                                            </Box>
                                        </Box>
                                    )}
                                </Paper>
                            </motion.div>
                        </AnimatePresence>

                        {loading && (
                            <Box sx={{ mt: 3 }}>
                                <LinearProgress
                                    color='success'
                                    variant="determinate"
                                    value={uploadProgress}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        mb: 2,
                                    }}
                                />
                                <Typography variant="body2" align="center" color="textSecondary">
                                    {uploadProgress < 100
                                        ? `Uploading... ${uploadProgress}%`
                                        : 'Processing...'}
                                </Typography>
                            </Box>
                        )}

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <Alert
                                    severity="error"
                                    sx={{ mt: 3 }}
                                    action={
                                        <IconButton
                                            color="inherit"
                                            size="small"
                                            onClick={() => setError(null)}
                                        >
                                            <Close />
                                        </IconButton>
                                    }
                                >
                                    <AlertTitle>Error</AlertTitle>
                                    {error}
                                </Alert>
                            </motion.div>
                        )}

                        <AnimatePresence>
                            {prediction && !loading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <Paper
                                        elevation={3}
                                        sx={{
                                            mt: 4,
                                            p: 3,
                                            background: theme.palette.background.paper,
                                            borderRadius: 2,
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <motion.div
                                            initial={{ x: '-100%' }}
                                            animate={{ x: 0 }}
                                            transition={{ duration: 0.5 }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                height: '4px',
                                                width: '100%',
                                                background: theme.palette.success.main
                                            }}
                                        />
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item>
                                                <Check
                                                    sx={{
                                                        color: theme.palette.success.main,
                                                        fontSize: 40
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs>
                                                <Typography variant="h6" color="success">
                                                    Analysis Results
                                                </Typography>
                                                <Typography variant="body1" sx={{ mt: 1 }}>
                                                    {prediction}
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <Tooltip title="Run another analysis">
                                                    <IconButton
                                                        onClick={() => {
                                                            setPrediction('');
                                                            setFile(null);
                                                            setPreview(null);
                                                            setText('');
                                                        }}
                                                    >
                                                        <Refresh />
                                                    </IconButton>
                                                </Tooltip>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Grid>

                    {preview && (
                        <Grid item xs={12} md={4}>
                            <AnimatePresence>
                                <motion.div
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 50 }}
                                >
                                    <Paper
                                        elevation={3}
                                        sx={{
                                            p: 3,
                                            background: theme.palette.background.paper,
                                            borderRadius: 2
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Typography variant="h6" color="success">
                                                Preview
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setFile(null);
                                                    setPreview(null);
                                                }}
                                            >
                                                <Close />
                                            </IconButton>
                                        </Box>
                                        {renderPreview()}
                                        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                                            {file?.name}
                                        </Typography>
                                    </Paper>
                                </motion.div>
                            </AnimatePresence>
                        </Grid>
                    )}
                </Grid>

                {/* Help Dialog */}
                <Dialog
                    open={showHelp}
                    onClose={() => setShowHelp(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        About Cyberbullying Detection
                    </DialogTitle>
                    <DialogContent>
                        <Typography paragraph>
                            Our advanced AI system analyzes content to detect potential instances of cyberbullying
                            using state-of-the-art natural language processing and machine learning techniques.
                        </Typography>
                        <Typography paragraph>
                            The system can process:
                        </Typography>
                        <li>Text</li>
                        <li>Images (including text in images)</li>
                        <li>Video content</li>
                        <li>Audio recordings</li>
                        <Typography color="success" sx={{ mt: 2 }}>
                            All data is processed securely and confidentially.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button variant='outlined' color='success' onClick={() => setShowHelp(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </motion.div>
        </Box>
    );
};

export default FileUploadUI;