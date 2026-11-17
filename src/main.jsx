import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import CardMapping from './components/CardMapping.jsx';
import './index.css';
import './styles.css';

createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).has('mapping') ? <CardMapping /> : <App />);
