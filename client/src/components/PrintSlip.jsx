// client/src/components/PrintSlip.jsx
import React, { useEffect } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Package,
  Building2,
  Calendar,
  User,
  MapPin,
  Truck
} from 'lucide-react';
import './PrintSlip.css';

/**
 * Reusable Printable Slip & Voucher Generator
 * Supports:
 * - Delivery Orders (WH/OUT) -> Packing & Dispatch Slip
 * - Receipts (WH/IN) -> Goods Receipt Voucher
 * - Internal Transfers (WH/INT) -> Internal Transfer Note
 */
export default function PrintSlip({
  isOpen,
  onClose,
  data,
  type = 'delivery', // 'delivery' | 'receipt' | 'transfer'
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  // Resolve Document Title & Type Details
  const isDelivery = type === 'delivery' || data.reference?.includes('OUT');
  const isReceipt = type === 'receipt' || data.reference?.includes('IN');
  const isTransfer = type === 'transfer' || data.reference?.includes('INT');

  const docTitle = isDelivery
    ? 'Packing & Dispatch Slip'
    : isReceipt
    ? 'Goods Receipt Voucher'
    : 'Internal Transfer Note';

  const docSubtitle = isDelivery
    ? 'Customer Order Fulfillment & Shipping Confirmation'
    : isReceipt
    ? 'Vendor Inbound Receiving & Quality Inspection Voucher'
    : 'Inter-Location Inventory Relocation Manifest';

  // Normalize Line items
  const lines = data.lines || [];
  const totalQtyOrdered = lines.reduce((acc, l) => acc + Number(l.quantity || l.demand_qty || l.qty || 0), 0);
  const totalQtyDone = lines.reduce((acc, l) => acc + Number(l.done_qty || l.quantity || l.qty || 0), 0);

  // Normalize Dates
  const rawDate = data.schedule_date || data.created_at || new Date().toISOString();
  let formattedDate = 'N/A';
  try {
    const d = new Date(rawDate);
    formattedDate = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    formattedDate = String(rawDate).split('T')[0];
  }

  // Normalize Contact & Address
  const contactName =
    data.to_contact ||
    data.from_contact ||
    data.partner_name ||
    (isDelivery ? 'Customer Consignee' : isReceipt ? 'Vendor Supplier' : 'Internal Operation');

  const contactAddress =
    data.delivery_address ||
    data.address ||
    data.shipping_address ||
    (isDelivery ? 'Standard Client Destination' : isReceipt ? 'Inbound Supplier Depot' : 'Internal Facility Relocation');

  // Normalize Locations
  const fromLocation =
    data.from_location_name ||
    data.from_location ||
    data.source_location ||
    'Main Storage (WH/STOCK)';

  const toLocation =
    data.to_location_name ||
    data.to_location ||
    data.dest_location ||
    (isDelivery ? 'Customer Location' : 'Main Storage (WH/STOCK)');

  // Normalize Responsible Staff
  const responsible =
    data.responsible_name ||
    data.responsible ||
    data.operator ||
    'Warehouse Operations Staff';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-slip-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="print-slip-modal">
        {/* Top Control Toolbar (Hidden during browser print) */}
        <div className="print-slip-toolbar no-print">
          <div className="print-slip-toolbar-title">
            <Printer size={18} color="#818cf8" />
            <span>Print Preview — {data.reference || 'Voucher'}</span>
          </div>

          <div className="print-slip-toolbar-actions">
            <button
              type="button"
              className="print-btn-secondary"
              onClick={onClose}
            >
              <X size={15} />
              <span>Close</span>
            </button>

            <button
              type="button"
              className="print-btn-primary"
              onClick={handlePrint}
            >
              <Printer size={15} />
              <span>Print Document</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="print-slip-scroll-area">
          <div className="formal-slip-sheet" id="stocksense-print-area">
            {/* Header: Company Brand & Reference */}
            <div className="slip-header-row">
              <div className="slip-company-brand">
                <div className="slip-company-name">
                  <Building2 size={24} color="#4f46e5" />
                  <span>StockSense Logistics</span>
                </div>
                <div className="slip-company-sub">
                  Enterprise Inventory Management & Supply Chain Control
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Warehouse Facility Code: <strong>{data.warehouse_code || data.warehouse_name || 'WH'}</strong>
                </div>
              </div>

              <div className="slip-doc-meta">
                <h2 className="slip-doc-title">{docTitle}</h2>
                <div className="slip-reference-badge">
                  {data.reference || 'N/A'}
                </div>
                <div>
                  <span className="slip-status-pill">
                    <CheckCircle2 size={12} />
                    <span>VALIDATED / {String(data.status || 'DONE').toUpperCase()}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Subtitle description */}
            <div style={{
              fontSize: '0.82rem',
              color: '#64748b',
              fontStyle: 'italic',
              marginBottom: '18px',
              paddingBottom: '8px',
              borderBottom: '1px dashed #e2e8f0',
            }}>
              {docSubtitle}
            </div>

            {/* Metadata Summary Grid */}
            <div className="slip-meta-grid">
              {/* Left Column: Contact / Destination */}
              <div className="slip-meta-block">
                <h4>
                  {isDelivery ? 'Consignee / Customer Details' : isReceipt ? 'Supplier / Vendor Details' : 'Transfer Details'}
                </h4>
                <div className="slip-meta-row">
                  <span className="slip-meta-label">Party / Partner:</span>
                  <span className="slip-meta-value">{contactName}</span>
                </div>
                <div className="slip-meta-row">
                  <span className="slip-meta-label">Address / Bay:</span>
                  <span className="slip-meta-value">{contactAddress}</span>
                </div>
                <div className="slip-meta-row">
                  <span className="slip-meta-label">Operation Type:</span>
                  <span className="slip-meta-value">{data.operation_type || (isDelivery ? 'Delivery Orders' : isReceipt ? 'Receipts' : 'Internal Transfer')}</span>
                </div>
              </div>

              {/* Right Column: Execution & Facility Details */}
              <div className="slip-meta-block">
                <h4>Logistics & Verification</h4>
                <div className="slip-meta-row">
                  <span className="slip-meta-label">Issue Date:</span>
                  <span className="slip-meta-value">{formattedDate}</span>
                </div>
                <div className="slip-meta-row">
                  <span className="slip-meta-label">Source Location:</span>
                  <span className="slip-meta-value">{fromLocation}</span>
                </div>
                <div className="slip-meta-row">
                  <span className="slip-meta-label">Destination:</span>
                  <span className="slip-meta-value">{toLocation}</span>
                </div>
                <div className="slip-meta-row">
                  <span className="slip-meta-label">Responsible Officer:</span>
                  <span className="slip-meta-value">{responsible}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="slip-table-container">
              <table className="slip-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '120px' }}>SKU / Code</th>
                    <th>Product Name & Specification</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Qty Ordered</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>
                      {isDelivery ? 'Qty Shipped' : isReceipt ? 'Qty Received' : 'Qty Transferred'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                        No product line items registered on this voucher.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, idx) => {
                      const ordered = Number(line.quantity || line.demand_qty || line.qty || 0);
                      const done = Number(line.done_qty || line.quantity || line.qty || 0);
                      const uom = line.uom || line.unit_of_measure || 'Units';

                      return (
                        <tr key={line.id || idx}>
                          <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td className="slip-sku-cell">
                            {line.product_sku || line.sku || 'N/A'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {line.product_name || line.name || 'Product'}
                            </div>
                            {line.category && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Category: {line.category}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', color: '#475569' }}>
                            {ordered.toLocaleString()} {uom}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {done.toLocaleString()} {uom}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'left' }}>
                      TOTAL SUMMARY: {lines.length} Line Item{lines.length !== 1 ? 's' : ''}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {totalQtyOrdered.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: '#15803d' }}>
                      {totalQtyDone.toLocaleString()} Units
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Formal Verification & Signatures Block */}
            <div className="slip-signatures-container">
              <div className="signature-box">
                <div className="signature-role">
                  Dispatcher / Warehouse Operator Sign-Off
                </div>
                <div className="signature-line" />
                <div className="signature-caption">
                  <span>Sign & Date</span>
                  <span>Name: ____________________</span>
                </div>
              </div>

              <div className="signature-box">
                <div className="signature-role">
                  Receiver / Carrier / Consignee Sign-Off
                </div>
                <div className="signature-line" />
                <div className="signature-caption">
                  <span>Sign & Date</span>
                  <span>Name: ____________________</span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="slip-footer-note">
              <div>
                Official Inventory Manifest • StockSense Logistics ERP System
              </div>
              <div>
                Generated on {new Date().toLocaleString('en-GB')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
