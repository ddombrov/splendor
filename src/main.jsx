import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ProtoApp from './prototype/ProtoApp.jsx'; // PROTOTYPE
import TableProto from './prototype-table/TableProto.jsx'; // PROTOTYPE
import './index.css';
import './styles.css';

// PROTOTYPE: ?prototype=home|pay swaps in the throwaway home and payment mockups,
// ?prototype=table&variant=A|B|C the throwaway playing-screen directions. Never in production builds.
const param = new URLSearchParams(window.location.search).get('prototype');
const proto = import.meta.env.PROD ? null : param;

createRoot(document.getElementById('root')).render(
  proto === 'table' ? <TableProto /> : proto !== null ? <ProtoApp /> : <App />,
);
