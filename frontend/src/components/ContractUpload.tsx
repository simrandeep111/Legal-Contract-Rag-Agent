import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Typography, Paper, LinearProgress, Alert, Stack, Chip, IconButton, TextField } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import { uploadContract } from '../services/api';
import { setNamespace, getNamespace } from '../utils/namespace';

interface FileUploadStatus {
  file: File;
  status: 'uploading' | 'success' | 'error';
  message?: string;
  chunksCreated?: number;
}

const ContractUpload: React.FC = () => {
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [namespace, setNamespaceState] = useState<string>(getNamespace() || '');
  const [namespaceError, setNamespaceError] = useState<string>('');

  const handleNamespaceChange = (value: string) => {
    // Allow only alphanumeric, hyphens, and underscores
    const sanitized = value.replace(/[^a-zA-Z0-9-_]/g, '');
    setNamespaceState(sanitized);
    setNamespace(sanitized);
    setNamespaceError('');
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Validate namespace
    if (!namespace.trim()) {
      setNamespaceError('Workspace name is required');
      setGlobalMessage({
        type: 'error',
        text: 'Please enter a workspace name before uploading documents.',
      });
      return;
    }

    setGlobalMessage(null);

    const newFiles: FileUploadStatus[] = acceptedFiles.map(file => ({
      file,
      status: 'uploading',
    }));

    setFiles(prev => [...prev, ...newFiles]);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      try {
        const result = await uploadContract(file, namespace);
        
        const fileResult = result.results?.[0] || { 
          status: 'success', 
          chunks_created: result.total_chunks 
        };
        
        if (fileResult.status === 'success') {
          successCount++;
        } else {
          errorCount++;
        }

        setFiles(prev =>
          prev.map(f =>
            f.file === file
              ? {
                  ...f,
                  status: fileResult.status as 'success' | 'error',
                  message: fileResult.status === 'success' 
                    ? `Processed successfully! ${fileResult.chunks_created} sections analyzed.`
                    : fileResult.message,
                  chunksCreated: fileResult.chunks_created,
                }
              : f
          )
        );
      } catch (error: any) {
        errorCount++;
        setFiles(prev =>
          prev.map(f =>
            f.file === file
              ? {
                  ...f,
                  status: 'error',
                  message: error.response?.data?.detail || error.message,
                }
              : f
          )
        );
      }
    }

    if (errorCount === 0) {
      setGlobalMessage({
        type: 'success',
        text: `${successCount} document${successCount > 1 ? 's' : ''} uploaded successfully to workspace "${namespace}"!`,
      });
    } else if (successCount === 0) {
      setGlobalMessage({
        type: 'error',
        text: `Failed to upload ${errorCount} document${errorCount > 1 ? 's' : ''}. Please try again.`,
      });
    } else {
      setGlobalMessage({
        type: 'error',
        text: `${successCount} uploaded, ${errorCount} failed. Please check the errors above.`,
      });
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(f => f.file !== fileToRemove));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1a2332 0%, #2d3e54 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DescriptionIcon sx={{ fontSize: 20, color: '#c9975b' }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1.25rem' }}>
            Upload Contracts
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Process and analyze multiple legal documents with AI
          </Typography>
        </Box>
      </Stack>

      {/* NAMESPACE INPUT FIELD */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(201, 151, 91, 0.03) 0%, rgba(201, 151, 91, 0.08) 100%)',
          border: '2px solid',
          borderColor: namespaceError ? '#ef4444' : 'rgba(201, 151, 91, 0.2)',
          boxShadow: '0 4px 20px rgba(26, 35, 50, 0.06)',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #c9975b 0%, #d4a870 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(201, 151, 91, 0.25)',
            }}
          >
            <FolderIcon sx={{ fontSize: 24, color: 'white' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
              Workspace Name *
            </Typography>
            <TextField
              fullWidth
              placeholder="Enter your workspace name (e.g., project-alpha, client-contracts)"
              value={namespace}
              onChange={(e) => handleNamespaceChange(e.target.value)}
              error={!!namespaceError}
              helperText={namespaceError || 'Use letters, numbers, hyphens, or underscores'}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  background: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(26, 35, 50, 0.15)',
                    borderWidth: '2px',
                  },
                  '&:hover fieldset': {
                    borderColor: '#c9975b',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#c9975b',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '14px 16px',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                },
              }}
            />
          </Box>
        </Stack>
      </Paper>

      <Paper
        {...getRootProps()}
        elevation={0}
        sx={{
          p: 5,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: isDragActive ? 'secondary.main' : 'rgba(26, 35, 50, 0.15)',
          backgroundColor: isDragActive ? 'rgba(201, 151, 91, 0.05)' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(26, 35, 50, 0.06)',
          '&:hover': {
            borderColor: 'secondary.main',
            backgroundColor: 'rgba(201, 151, 91, 0.03)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(26, 35, 50, 0.1)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(201, 151, 91, 0.1), transparent)',
            transition: 'left 0.5s',
          },
          '&:hover::before': {
            left: '100%',
          },
        }}
      >
        <input {...getInputProps()} />
        
        <Box
          sx={{
            width: 80,
            height: 80,
            margin: '0 auto',
            mb: 3,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #c9975b 0%, #d4a870 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(201, 151, 91, 0.25)',
            animation: isDragActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': {
                transform: 'scale(1)',
              },
              '50%': {
                transform: 'scale(1.05)',
              },
            },
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 40, color: 'white' }} />
        </Box>

        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            fontWeight: 600, 
            color: 'text.primary',
            mb: 1,
          }}
        >
          {isDragActive ? 'Drop your contracts here' : 'Upload Contract Documents'}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Drag and drop multiple PDF contracts, or click to browse
        </Typography>

        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
          <Chip
            label="PDF Only"
            size="small"
            sx={{
              background: 'rgba(26, 35, 50, 0.05)',
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
          <Chip
            label="Multiple Files"
            size="small"
            sx={{
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#1e40af',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
          <Chip
            label="Secure Processing"
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            sx={{
              background: 'rgba(74, 222, 128, 0.1)',
              color: '#15803d',
              fontWeight: 500,
              fontSize: '0.75rem',
              '& .MuiChip-icon': {
                color: '#15803d',
              },
            }}
          />
          <Chip
            label="Fast Analysis"
            size="small"
            sx={{
              background: 'rgba(201, 151, 91, 0.1)',
              color: '#92400e',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
        </Stack>
      </Paper>

      {/* File Upload Progress List */}
      {files.length > 0 && (
        <Stack spacing={2} sx={{ mt: 3 }}>
          {files.map((fileStatus, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '12px',
                background:
                  fileStatus.status === 'uploading'
                    ? 'rgba(201, 151, 91, 0.03)'
                    : fileStatus.status === 'success'
                    ? 'rgba(74, 222, 128, 0.03)'
                    : 'rgba(239, 68, 68, 0.03)',
                border:
                  fileStatus.status === 'uploading'
                    ? '1px solid rgba(201, 151, 91, 0.2)'
                    : fileStatus.status === 'success'
                    ? '1px solid rgba(74, 222, 128, 0.2)'
                    : '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background:
                      fileStatus.status === 'uploading'
                        ? 'linear-gradient(135deg, #c9975b 0%, #d4a870 100%)'
                        : fileStatus.status === 'success'
                        ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: fileStatus.status === 'uploading' ? 'rotate 2s linear infinite' : 'none',
                    '@keyframes rotate': {
                      from: { transform: 'rotate(0deg)' },
                      to: { transform: 'rotate(360deg)' },
                    },
                  }}
                >
                  {fileStatus.status === 'uploading' && <DescriptionIcon sx={{ fontSize: 20, color: 'white' }} />}
                  {fileStatus.status === 'success' && <CheckCircleIcon sx={{ fontSize: 20, color: 'white' }} />}
                  {fileStatus.status === 'error' && <ErrorIcon sx={{ fontSize: 20, color: 'white' }} />}
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 500,
                      color: 'text.primary',
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fileStatus.file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    {fileStatus.status === 'uploading' && 'Processing...'}
                    {fileStatus.status === 'success' && fileStatus.message}
                    {fileStatus.status === 'error' && `Error: ${fileStatus.message}`}
                  </Typography>
                </Box>

                {fileStatus.status !== 'uploading' && (
                  <IconButton
                    size="small"
                    onClick={() => removeFile(fileStatus.file)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#dc2626',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>

              {fileStatus.status === 'uploading' && (
                <LinearProgress
                  sx={{
                    mt: 2,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(201, 151, 91, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #c9975b 0%, #d4a870 100%)',
                      borderRadius: 3,
                    },
                  }}
                />
              )}
            </Paper>
          ))}
        </Stack>
      )}

      {globalMessage && (
        <Alert
          severity={globalMessage.type}
          icon={globalMessage.type === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
          sx={{
            mt: 2,
            borderRadius: '12px',
            boxShadow:
              globalMessage.type === 'success'
                ? '0 4px 20px rgba(74, 222, 128, 0.15)'
                : '0 4px 20px rgba(239, 68, 68, 0.15)',
            border:
              globalMessage.type === 'success'
                ? '1px solid rgba(74, 222, 128, 0.2)'
                : '1px solid rgba(239, 68, 68, 0.2)',
            '& .MuiAlert-message': {
              fontWeight: 500,
            },
          }}
        >
          {globalMessage.text}
        </Alert>
      )}
    </Box>
  );
};

export default ContractUpload;
