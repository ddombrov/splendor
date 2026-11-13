import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ProtoApp from './prototype/ProtoApp.jsx'; // PROTOTYPE
import './index.css';
import './styles.css';

// PROTOTYPE: ?prototype=home|pay swaps in the throwaway prototype. Never in production builds.
const showPrototype = !import.meta.env.PROD && new URLSearchParams(window.location.search).has('prototype');

createRoot(document.getElementById('root')).render(showPrototype ? <ProtoApp /> : <App />);
