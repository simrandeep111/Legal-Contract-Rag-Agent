import React from 'react';
import { Container, Typography, Box, Stack } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GavelIcon from '@mui/icons-material/Gavel';
import ContractUpload from './components/ContractUpload';
import ContractQuery from './components/ContractQuery';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a2332',
      light: '#2d3e54',
      dark: '#0f1721',
    },
    secondary: {
      main: '#c9975b',
      light: '#d4a870',
      dark: '#b38547',
    },
    background: {
      default: '#f7f8fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a2332',
      secondary: '#5a6c7d',
    },
  },
  typography: {
    fontFamily: '"Spectral", "Georgia", serif',
    h3: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontFamily: '"Spectral", "Georgia", serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Spectral", "Georgia", serif',
      fontWeight: 600,
    },
    body1: {
      fontFamily: '"Work Sans", "Helvetica", sans-serif',
      fontWeight: 400,
      letterSpacing: '0.01em',
    },
    body2: {
      fontFamily: '"Work Sans", "Helvetica", sans-serif',
      fontWeight: 400,
    },
    button: {
      fontFamily: '"Work Sans", "Helvetica", sans-serif',
      fontWeight: 500,
      letterSpacing: '0.05em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 2px 4px rgba(26, 35, 50, 0.04)',
    '0 4px 12px rgba(26, 35, 50, 0.08)',
    '0 8px 24px rgba(26, 35, 50, 0.12)',
    '0 12px 32px rgba(26, 35, 50, 0.16)',
    ...Array(20).fill('0 16px 40px rgba(26, 35, 50, 0.2)'),
  ] as any,
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Spectral:wght@400;600;700&family=Work+Sans:wght@400;500;600&display=swap');
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes shimmer {
            0% {
              background-position: -1000px 0;
            }
            100% {
              background-position: 1000px 0;
            }
          }
          
          .animate-in {
            animation: fadeInUp 0.6s ease-out forwards;
            opacity: 0;
          }
          
          .delay-1 { animation-delay: 0.1s; }
          .delay-2 { animation-delay: 0.2s; }
          .delay-3 { animation-delay: 0.3s; }
          
          body {
            overflow-x: hidden;
          }
        `}
      </style>
      <Box
        sx={{
          minHeight: '100vh',
          position: 'relative',
          background: 'linear-gradient(180deg, #f7f8fa 0%, #eef1f5 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '300px', 
            background: 'linear-gradient(135deg, #1a2332 0%, #2d3e54 100%)',
            zIndex: 0,
          },

          py: 6,
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 6, pt: 4 }} className="animate-in">
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" mb={2}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #c9975b 0%, #d4a870 100%)',
                  boxShadow: '0 8px 24px rgba(201, 151, 91, 0.3)',
                  transform: 'rotate(-5deg)',
                }}
              >
                <GavelIcon sx={{ fontSize: 40, color: 'white', transform: 'rotate(5deg)' }} />
              </Box>
            </Stack>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                color: 'white',
                mb: 2,
                textShadow: '0 2px 20px rgba(0,0,0,0.2)',
                letterSpacing: '-0.03em',
              }}
            >
              Contract Intelligence
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 400,
                mb: 1,
                fontSize: '1.1rem',
              }}
            >
              AI-Powered Legal Document Analysis
            </Typography>

          </Box>

          {/* Upload Section */}
          <Box sx={{ mb: 4 }} className="animate-in delay-1">
            <ContractUpload />
          </Box>

          {/* Query Section */}
          <Box className="animate-in delay-2">
            <ContractQuery />
          </Box>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 8, pb: 4 }} className="animate-in delay-3">
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              Powered by Advanced RAG Technology • Secure • Enterprise-Ready
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;