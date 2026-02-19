import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArticleIcon from '@mui/icons-material/Article';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { queryContracts, Source } from '../services/api';
import { getNamespace } from '../utils/namespace';

const ContractQuery: React.FC = () => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topK] = useState(10);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    const namespace = getNamespace();
    if (!namespace) {
      setError('Please upload documents first to set a workspace name.');
      return;
    }

    setLoading(true);
    setAnswer('');
    setSources([]);
    setError('');

    try {
      const result = await queryContracts(query, namespace, topK);
      setAnswer(result.answer);
      setSources(result.sources);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentNamespace = getNamespace();

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
          <SmartToyIcon sx={{ fontSize: 20, color: '#c9975b' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1.25rem' }}>
            Query Contracts
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Ask questions and get AI-powered insights from your documents
            {currentNamespace && (
              <Chip
                label={`Workspace: ${currentNamespace}`}
                size="small"
                sx={{
                  ml: 1,
                  background: 'rgba(201, 151, 91, 0.1)',
                  color: '#92400e',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                }}
              />
            )}
          </Typography>
        </Box>
      </Stack>

      {/* QUERY INPUT */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '16px',
          border: '2px solid rgba(26, 35, 50, 0.1)',
          boxShadow: '0 4px 20px rgba(26, 35, 50, 0.06)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'rgba(201, 151, 91, 0.3)',
            boxShadow: '0 8px 30px rgba(26, 35, 50, 0.1)',
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about your contracts... (e.g., 'What are the termination clauses?')"
          variant="outlined"
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
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
              fontSize: '0.95rem',
              lineHeight: 1.6,
            },
          }}
        />

        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1}>
            <Chip
              label="AI-Powered"
              size="small"
              sx={{
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#1e40af',
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
            />
            <Chip
              label="Context-Aware"
              size="small"
              sx={{
                background: 'rgba(201, 151, 91, 0.1)',
                color: '#92400e',
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
            />
          </Stack>

          <Button
            variant="contained"
            size="medium"
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            sx={{
              px: 3,
              py: 1,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c9975b 0%, #d4a870 100%)',
              boxShadow: '0 4px 16px rgba(201, 151, 91, 0.3)',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              '&:hover': {
                background: 'linear-gradient(135deg, #b38547 0%, #c9975b 100%)',
                boxShadow: '0 6px 20px rgba(201, 151, 91, 0.4)',
                transform: 'translateY(-2px)',
              },
              '&:disabled': {
                background: 'rgba(26, 35, 50, 0.1)',
                color: 'rgba(26, 35, 50, 0.3)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {loading ? 'Analyzing...' : 'Get AI Answer'}
          </Button>
        </Stack>
      </Paper>

      {/* ERROR */}
      {error && (
        <Alert
          severity="error"
          sx={{
            mt: 3,
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
          }}
        >
          {error}
        </Alert>
      )}

      {/* ANSWER */}
      {answer && (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 4,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.03) 0%, rgba(74, 222, 128, 0.08) 100%)',
            border: '2px solid rgba(74, 222, 128, 0.2)',
            boxShadow: '0 4px 20px rgba(74, 222, 128, 0.15)',
          }}
        >
          <Stack direction="row" spacing={2} mb={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 16px rgba(74, 222, 128, 0.25)',
              }}
            >
              <SmartToyIcon sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                AI Analysis
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Based on {sources.length} relevant source{sources.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 2, borderColor: 'rgba(74, 222, 128, 0.2)' }} />

          <Typography
            variant="body1"
            sx={{
              color: 'text.primary',
              lineHeight: 1.8,
              fontSize: '0.95rem',
              whiteSpace: 'pre-wrap',
            }}
          >
            {answer}
          </Typography>
        </Paper>
      )}

      {/* SOURCES */}
      {sources.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #1a2332 0%, #2d3e54 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArticleIcon sx={{ fontSize: 18, color: '#c9975b' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', color: 'text.primary' }}>
              Source Documents ({sources.length})
            </Typography>
          </Stack>

          <Stack spacing={2}>
            {sources.map((source, index) => (
              <Accordion
                key={index}
                elevation={0}
                sx={{
                  borderRadius: '12px !important',
                  border: '1px solid rgba(26, 35, 50, 0.1)',
                  boxShadow: '0 2px 12px rgba(26, 35, 50, 0.04)',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    margin: '0 !important',
                    borderColor: 'rgba(201, 151, 91, 0.3)',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon
                      sx={{
                        color: '#c9975b',
                        background: 'rgba(201, 151, 91, 0.1)',
                        borderRadius: '6px',
                        padding: '4px',
                      }}
                    />
                  }
                  sx={{
                    borderRadius: '12px',
                    '&.Mui-expanded': {
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                    },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #c9975b 0%, #d4a870 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontWeight: 700,
                        color: 'white',
                        fontSize: '0.9rem',
                      }}
                    >
                      {source.source_num}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {source.document}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                        {source.page ? `Page ${source.page}` : 'Location Unknown'}
                      </Typography>
                    </Box>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    pt: 2,
                    pb: 3,
                    px: 3,
                    background: 'rgba(26, 35, 50, 0.02)',
                    borderTop: '1px solid rgba(26, 35, 50, 0.08)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.7,
                      fontSize: '0.9rem',
                    }}
                  >
                    {source.excerpt}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default ContractQuery;