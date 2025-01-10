import React, { useState, useLayoutEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    CircularProgress,
    Alert,
    AlertTitle,
    Button,
} from '@mui/material';
import { motion } from 'framer-motion';
import { UploadFile, Description, VideoFile, AudioFile } from '@mui/icons-material';
import { useSnackbar } from '../hooks/SnackBarProvider';
import { useDispatch } from 'react-redux';
import { setCurrentPage } from '../store/authSlice';
import axios from 'axios';

const TextExtractionUI = () => {
    const [file, setFile] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [predictionresponse, setPredictionResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const openSnackbar = useSnackbar();
    const dispatch = useDispatch();

    useLayoutEffect(() => {
        dispatch(setCurrentPage('Text Extraction'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDrag = (e) => {
        e.preventDefault();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setDragActive(false);
        const files = e.dataTransfer.files;
        if (files?.[0]) await handleFile(files[0]);
    };

    const handleFile = async (file) => {
        setFile(file);
        setLoading(true);
        setExtractedText('');
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:17291/api/predict', formData);
            setExtractedText(response?.data?.extracted_text);
            setPredictionResponse(response?.data);
        } catch (error) {
            openSnackbar(error?.response?.data?.message || error?.response?.status, 'danger');
            console.log('Error:', error);
            setPredictionResponse(null);
        } finally {
            setLoading(false);
        }
    };

    const renderFilePreview = () => {
        if (!file) return null;

        const fileUrl = URL.createObjectURL(file);
        const fileType = file.type.split('/')[0];

        switch (fileType) {
            case 'image':
                return (
                    <img
                        src={fileUrl}
                        alt="Preview"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 0, 0, 0.12)',
                        }}
                    />
                );
            case 'video':
                return (
                    <video
                        controls
                        src={fileUrl}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 0, 0, 0.12)',
                        }}
                    />
                );
            case 'audio':
                return (
                    <audio controls src={fileUrl} style={{ width: '100%' }} />
                );
            default:
                return <Typography variant="body2">Unsupported file type</Typography>;
        }
    };

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            sx={{ height: '100%' }}
        >
            <Box maxWidth="md" mx="auto" py={4} sx={{ height: '100%' }}>
                <Card raised>
                    <CardContent>
                        <Box
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            sx={{
                                p: 4,
                                border: '2px dashed',
                                borderColor: dragActive ? 'primary.main' : 'text.secondary',
                                bgcolor: dragActive ? 'primary.light' : 'background.paper',
                                textAlign: 'center',
                                borderRadius: 2,
                                transition: 'all 0.3s ease-in-out',
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
                                <Button
                                    component="span"
                                    color="success"
                                    startIcon={<UploadFile fontSize="large" />}
                                    sx={{ mb: 2 }}
                                >
                                    Drag & Drop or Click to Upload
                                </Button>
                            </label>
                            <Typography variant="body2" color="textSecondary">
                                Supported formats: image/*,video/*,audio/*
                            </Typography>
                        </Box>

                        {file && (
                            <Box mt={4} textAlign="center">
                                {renderFilePreview()}
                            </Box>
                        )}

                        {loading && (
                            <Box display="flex" justifyContent="center" mt={4}>
                                <CircularProgress color="success" />
                            </Box>
                        )}

                        {error && (
                            <Alert severity="error" sx={{ mt: 4 }}>
                                <AlertTitle>Error</AlertTitle>
                                {error}
                            </Alert>
                        )}

                        {extractedText && !loading && (
                            <Box mt={4}>
                                <Card>
                                    <CardHeader
                                        avatar={<Description color="success" />}
                                        title="Extracted Text"
                                        titleTypographyProps={{ variant: 'h6' }}
                                        sx={{ bgcolor: 'background.paper' }}
                                    />
                                    <CardContent>
                                        <Typography
                                            variant="body1"
                                            sx={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}
                                        >
                                            {extractedText}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        )}

                        {predictionresponse?.audio_text && !loading && (
                            <Box mt={4}>
                                <Card>
                                    <CardHeader
                                        avatar={<AudioFile color="success" />}
                                        title="Extracted Text from Audio"
                                        titleTypographyProps={{ variant: 'h6' }}
                                        sx={{ bgcolor: 'background.paper' }}
                                    />
                                    <CardContent>
                                        <Typography
                                            variant="body1"
                                            sx={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}
                                        >
                                            {predictionresponse?.audio_text}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        )}

                        {predictionresponse?.frame_texts && !loading && (
                            <Box mt={4}>
                                <Card>
                                    <CardHeader
                                        avatar={<VideoFile color="success" />}
                                        title="Extracted Text from Video Frames"
                                        titleTypographyProps={{ variant: 'h6' }}
                                        sx={{ bgcolor: 'background.paper' }}
                                    />
                                    <CardContent>
                                        <Typography
                                            variant="body1"
                                            sx={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}
                                        >
                                            {predictionresponse?.frame_texts}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        )}

                        {
                            predictionresponse && !loading && (
                                <Box mt={4}>
                                    <Typography
                                        variant="h4"
                                        mb={2}
                                        style={{
                                            fontWeight: 'bold',
                                            textShadow: '2px 2px 4px rgba(202, 211, 24, 0.2)'
                                        }}
                                    >
                                        Full Response
                                    </Typography>

                                    <pre
                                        style={{
                                            maxHeight: '400px',
                                            overflowY: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            fontSize: '13px',
                                            scrollbarWidth: 'thin'
                                        }}>
                                        <code lang='language-json'>{JSON.stringify(predictionresponse, null, 8)}</code>
                                    </pre>
                                </Box>
                            )
                        }
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default TextExtractionUI;