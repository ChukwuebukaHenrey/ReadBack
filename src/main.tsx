import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { Router } from './Router';
import './style.css';
createRoot(document.getElementById('root')!).render(<StrictMode><MotionConfig reducedMotion="user"><Router /></MotionConfig></StrictMode>);
