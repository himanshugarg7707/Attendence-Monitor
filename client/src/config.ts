const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const BASE_URL = isDev ? "http://localhost:4000" : "https://attendence-monitor.onrender.com";
export const WS_URL = isDev ? "ws://localhost:4000" : "wss://attendence-monitor.onrender.com";
