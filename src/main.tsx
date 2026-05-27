import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// Ensure theme is initialized immediately
import '@/hooks/useTheme'

// Force global timezone to Benin (Africa/Porto-Novo - UTC+1) across the entire app
const OriginalDateTimeFormat = Intl.DateTimeFormat;
// @ts-ignore
Intl.DateTimeFormat = function (locales?: any, options?: any) {
  const adjustedOptions = {
    timeZone: 'Africa/Porto-Novo',
    ...options,
  };
  return new OriginalDateTimeFormat(locales, adjustedOptions);
};
Object.defineProperty(Intl.DateTimeFormat, 'prototype', {
  value: OriginalDateTimeFormat.prototype,
  writable: false,
});
Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;

const originalToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (locales?: any, options?: any) {
  return originalToLocaleString.call(this, locales, { timeZone: 'Africa/Porto-Novo', ...options });
};

const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (locales?: any, options?: any) {
  return originalToLocaleDateString.call(this, locales, { timeZone: 'Africa/Porto-Novo', ...options });
};

const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
Date.prototype.toLocaleTimeString = function (locales?: any, options?: any) {
  return originalToLocaleTimeString.call(this, locales, { timeZone: 'Africa/Porto-Novo', ...options });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
