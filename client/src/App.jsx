// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReceiptsList  from './features/receipts/ReceiptsList';
import ReceiptDetail from './features/receipts/ReceiptDetail';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect → Receipts (until Auth feature is added) */}
        <Route path="/" element={<Navigate to="/receipts" replace />} />

        {/* ── Receipts feature ─────────────────────────────────────── */}
        <Route path="/receipts"     element={<ReceiptsList />} />
        <Route path="/receipts/:id" element={<ReceiptDetail />} />

        {/* Other features: teammates will append their <Route> here */}
      </Routes>
    </BrowserRouter>
  );
}
