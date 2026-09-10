import React, { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { useAppSettings } from '../contexts/AppSettingsContext';

const ReceiptModal = ({ isOpen, onClose, sale }) => {
  const { settings } = useAppSettings();
  const receiptRef = useRef(null);

  if (!isOpen || !sale) return null;

  const tpl = settings?.receiptTemplate || {};
  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', KES: 'KSh', TZS: 'TSh', UGX: 'USh' }[settings?.currency] || '$';
  const fmt = (n) => `${sym}${Number(n || 0).toFixed(2)}`;

  const businessName = tpl.headerText || settings?.businessName || 'METANOPUS STORE';
  const footer      = tpl.footerText  || settings?.receiptFooter || 'Thank you for shopping with us!';
  const social      = tpl.socialMedia || '';
  const returnPolicy = tpl.returnPolicy || '';
  const showTax     = tpl.showTaxBreakdown !== false;
  const width       = tpl.thermalWidth || '58mm';

  const receiptId   = String(sale.id || '').padStart(8, '0');
  const saleDate    = sale.date || new Date().toISOString().split('T')[0];
  const saleTime    = sale.time || sale.timestamp?.split('T')[1]?.slice(0, 8) || '';
  const payMethod   = (sale.paymentMethod || 'cash').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const widthPx = width === '80mm' ? 320 : width === 'A4' ? 595 : 240; // 58mm ≈ 240px

  /* ─── Print function ─── */
  const handlePrint = () => {
    const pageSize = width === 'A4' ? 'A4' : `${width} 297mm`;
    const bodyWidth = width === 'A4' ? '595px' : width === '80mm' ? '302px' : '218px';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt #${receiptId}</title>
  <style>
    @page { size: ${pageSize}; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: ${bodyWidth};
      margin: 0 auto;
      padding: 12px 8px;
      font-size: 11px;
      color: #111;
      background: #fff;
    }
    .center  { text-align: center; }
    .bold    { font-weight: 700; }
    .lg      { font-size: 16px; }
    .md      { font-size: 13px; }
    .sm      { font-size: 10px; color: #555; }
    .divider { border: none; border-top: 1px dashed #999; margin: 6px 0; }
    .divider-solid { border: none; border-top: 1px solid #111; margin: 6px 0; }
    .row     { display: flex; justify-content: space-between; padding: 2px 0; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-weight: 700; font-size: 13px; }
    .badge   { display: inline-block; padding: 2px 8px; border: 1px solid #111; border-radius: 4px; margin: 4px 0; }
    .barcode { letter-spacing: 4px; font-size: 12px; margin: 4px 0; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="center">
    <p class="bold lg">${businessName}</p>
    ${settings?.address ? `<p class="sm">${settings.address}</p>` : ''}
    ${settings?.phone ? `<p class="sm">Tel: ${settings.phone}</p>` : ''}
    ${social ? `<p class="sm">${social}</p>` : ''}
  </div>

  <hr class="divider-solid"/>

  <p class="center bold md">SALES RECEIPT</p>
  <div class="row"><span>Receipt #</span><span class="bold">${receiptId}</span></div>
  <div class="row"><span>Date</span><span>${saleDate} ${saleTime}</span></div>
  <div class="row"><span>Cashier</span><span>${sale.cashierName || '—'}</span></div>
  ${sale.customerName && sale.customerName !== 'Walk-in Customer' ? `<div class="row"><span>Customer</span><span>${sale.customerName}</span></div>` : ''}

  <hr class="divider"/>

  <div class="row bold sm"><span>ITEM</span><span>QTY &nbsp; PRICE &nbsp; TOTAL</span></div>
  <hr class="divider"/>

  ${(sale.items || []).map(item => `
    <div>
      <span class="bold">${item.name || item.productName}</span>
      <div class="row sm">
        <span>&nbsp;</span>
        <span>${item.quantity} × ${fmt(item.price)} = ${fmt(item.total)}</span>
      </div>
    </div>
  `).join('')}

  <hr class="divider"/>

  ${showTax ? `
    <div class="row"><span>Subtotal</span><span>${fmt(sale.subtotal)}</span></div>
    ${sale.discount > 0 ? `<div class="row"><span>Discount</span><span>-${fmt(sale.discount)}</span></div>` : ''}
    <div class="row"><span>Tax (${settings?.taxRate || 0}%)</span><span>${fmt(sale.tax)}</span></div>
  ` : ''}

  <hr class="divider-solid"/>
  <div class="total-row"><span>TOTAL</span><span>${fmt(sale.total)}</span></div>
  <hr class="divider-solid"/>

  <div class="center">
    <span class="badge bold">${payMethod}${sale.status === 'credit' ? ' — CREDIT' : ''}</span>
  </div>

  ${sale.payments && sale.payments.length > 1 ? `
    <hr class="divider"/>
    <p class="sm bold">Split Payment:</p>
    ${sale.payments.map(p => `<div class="row sm"><span>${p.method?.replace(/_/g,'') || p.method}</span><span>${fmt(p.amount)}</span></div>`).join('')}
  ` : ''}

  <hr class="divider"/>

  <p class="center bold">${footer}</p>
  ${returnPolicy ? `<p class="center sm">${returnPolicy}</p>` : ''}

  <p class="center barcode sm">${String(sale.id || '').padStart(12, '0')}</p>
  <p class="center sm">Powered by Metanopus MIS</p>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  /* ─── Modal preview ─── */
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Receipt Preview</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt paper */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            ref={receiptRef}
            style={{ maxWidth: `${widthPx}px`, margin: '0 auto' }}
            className="bg-white text-gray-900 rounded-lg shadow-lg border border-gray-200 p-5 font-mono text-xs"
          >
            {/* Store header */}
            <div className="text-center mb-4 border-b-2 border-gray-800 pb-3">
              <p className="font-bold text-base leading-tight">{businessName}</p>
              {settings?.address && <p className="text-gray-500 text-[10px] mt-0.5">{settings.address}</p>}
              {settings?.phone   && <p className="text-gray-500 text-[10px]">Tel: {settings.phone}</p>}
              {social            && <p className="text-gray-500 text-[10px]">{social}</p>}
            </div>

            <p className="text-center font-bold tracking-widest text-[11px] mb-3">SALES RECEIPT</p>

            <div className="space-y-0.5 mb-3">
              <div className="flex justify-between"><span>Receipt #</span><span className="font-bold">{receiptId}</span></div>
              <div className="flex justify-between"><span>Date</span><span>{saleDate} {saleTime}</span></div>
              <div className="flex justify-between"><span>Cashier</span><span>{sale.cashierName || '—'}</span></div>
              {sale.customerName && sale.customerName !== 'Walk-in Customer' && (
                <div className="flex justify-between"><span>Customer</span><span>{sale.customerName}</span></div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
              <div className="flex justify-between text-[10px] text-gray-500 font-bold mb-1">
                <span>ITEM</span><span>QTY × PRICE = TOTAL</span>
              </div>
              {(sale.items || []).map((item, i) => (
                <div key={i} className="mb-1.5">
                  <p className="font-semibold truncate">{item.name || item.productName}</p>
                  <div className="flex justify-between text-gray-600 text-[10px] pl-2">
                    <span></span>
                    <span>{item.quantity} × {fmt(item.price)} = {fmt(item.total)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400 pt-2 mb-2 space-y-0.5">
              {showTax && (
                <>
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmt(sale.subtotal)}</span></div>
                  {sale.discount > 0 && <div className="flex justify-between text-orange-600"><span>Discount</span><span>-{fmt(sale.discount)}</span></div>}
                  <div className="flex justify-between"><span>Tax ({settings?.taxRate || 0}%)</span><span>{fmt(sale.tax)}</span></div>
                </>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-gray-800 pt-1 mt-1">
                <span>TOTAL</span><span>{fmt(sale.total)}</span>
              </div>
            </div>

            <div className="text-center my-3">
              <span className="border border-gray-800 rounded px-3 py-0.5 font-bold text-[11px]">
                {payMethod}{sale.status === 'credit' ? ' — CREDIT' : ''}
              </span>
            </div>

            {sale.payments && sale.payments.length > 1 && (
              <div className="border-t border-dashed border-gray-400 pt-2 mb-2 space-y-0.5">
                <p className="text-[10px] text-gray-500 font-bold">SPLIT PAYMENT</p>
                {sale.payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span className="capitalize">{String(p.method || '').replace(/_/g, ' ')}</span>
                    <span>{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-dashed border-gray-400 pt-3 text-center space-y-1">
              <p className="font-bold text-[11px]">{footer}</p>
              {returnPolicy && <p className="text-gray-500 text-[10px]">{returnPolicy}</p>}
            </div>

            <p className="text-center tracking-[4px] text-[10px] text-gray-400 mt-3">
              {String(sale.id || '').padStart(12, '0')}
            </p>
            <p className="text-center text-[9px] text-gray-400">Powered by Metanopus MIS</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
