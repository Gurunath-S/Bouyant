import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../services/api/apiClient';
import { Invoice } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { formatDisplayDate } from '../../../utils/date';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import { numberToIndianWords } from '../../../utils/numberToWords';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchInvoice() {
    try {
      setLoading(true);
      const res: any = await apiClient.get(`/invoices/${id}`);
      setInvoice(res.data);
    } catch (err) {
      console.error('Failed to load invoice:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Loading Tax Invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Invoice Not Found</h3>
        <Button variant="outline" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const booking = (invoice as any).booking;
  const company = invoice.company || booking?.company;
  const exhibition = booking?.exhibition;
  const stalls = booking?.stalls || [];

  const grandTotal = Number(invoice.grandTotal || booking?.grandTotal || 0);
  const taxAmount = Number(invoice.taxAmount || booking?.taxAmount || 0);
  const taxableAmount = Number(invoice.totalAmount || booking?.totalAmount || (grandTotal - taxAmount));
  const cgstAmount = Number((taxAmount / 2).toFixed(2));
  const sgstAmount = Number((taxAmount / 2).toFixed(2));

  const primaryStall = stalls[0]?.stall || { stallNumber: 'A14', category: 'PREMIUM', areaSqFt: 100 };
  const totalQty = stalls.reduce((sum: number, bs: any) => sum + (bs.stall?.areaSqFt || 100), 0) || (primaryStall.areaSqFt || 100);

  const formatMoney = (val: number) =>
    val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:m-0 print:p-0 print:bg-white print:text-black font-sans text-xs">
      {/* Actions & Buttons (Hidden during print) */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <button
          onClick={() => navigate('/invoices')}
          className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadInvoicePdf(invoice.id || id || '', invoice.invoiceNumber)}
            leftIcon={<Download className="w-4 h-4 text-purple-600" />}
          >
            Download Official PDF
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer className="w-4 h-4" />}>
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Printable Invoice Outer Box (Exact Tally Format) */}
      <div className="bg-white text-black border-[1.5px] border-black text-[11px] leading-tight select-none shadow-xl print:shadow-none print:border-black">
        {/* Header Table */}
        <div className="grid grid-cols-2 border-b-[1.5px] border-black">
          {/* Supplier Info */}
          <div className="p-2 border-r-[1.5px] border-black space-y-0.5">
            <div className="font-bold text-sm">BUOYANT MEDIA</div>
            <div>NO 57A, 2ND FLOOR,</div>
            <div>RAMASAMY STREET, KK PUDUR,</div>
            <div>NSR ROAD, CBE-641038</div>
            <div>MOBILE : 9500288222</div>
            <div>GSTIN : 33ACXPH4512M1ZA</div>
            <div>State Name : Tamil Nadu, Code : 33</div>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-2">
            <div className="p-2 border-r border-black">
              <div>Invoice No.</div>
              <div className="font-bold underline text-xs mt-1">{invoice.invoiceNumber || '160'}</div>
            </div>
            <div className="p-2">
              <div>Dated</div>
              <div className="font-bold text-xs mt-1">{formatDisplayDate(invoice.issueDate || (invoice as any).createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Buyer (Bill To) Box */}
        <div className="p-2 border-b-[1.5px] border-black space-y-0.5">
          <div className="text-[10px]">Buyer (Bill To)</div>
          <div className="font-bold text-xs uppercase">{company?.name || 'STAG MEDICAL SYSTEMS'}</div>
          <div className="uppercase">{company?.address || 'NO:115/5, SIVANANDHAPURAM, 4TH STREET'}</div>
          <div className="uppercase">{company?.city || 'COIMBATORE'}</div>
          <div>GSTIN/UIN : {company?.gstNumber || '33GWSPS1468G1ZX'}</div>
          <div>State Name  : {company?.state || 'Tamil Nadu'}</div>
        </div>

        {/* Items Table */}
        <div className="border-b-[1.5px] border-black">
          <div className="grid grid-cols-12 border-b-[1.5px] border-black text-center text-[10px] font-normal py-1">
            <div className="col-span-1 border-r border-black">Sl<br/>No</div>
            <div className="col-span-5 border-r border-black">Description of Goods</div>
            <div className="col-span-2 border-r border-black">HSN/SAC</div>
            <div className="col-span-1 border-r border-black">Quantity</div>
            <div className="col-span-1 border-r border-black">Per</div>
            <div className="col-span-2">Amount</div>
          </div>

          <div className="grid grid-cols-12 min-h-[220px]">
            {/* Sl No */}
            <div className="col-span-1 border-r border-black p-2 text-right">1</div>

            {/* Description */}
            <div className="col-span-5 border-r border-black p-2 space-y-0.5 leading-snug">
              <div className="font-bold uppercase">STALL NO : {primaryStall.stallNumber} ({primaryStall.category || 'PREMIUM'})</div>
              <div className="font-bold">{primaryStall.areaSqFt || 100} SQFT</div>
              <div className="font-bold mt-1 uppercase">{exhibition?.title || 'MEDICCON EXPO'} (EDITION - {exhibition?.edition || '4'}),</div>
              <div className="font-bold">DATE: {exhibition?.startDate ? `${formatDisplayDate(exhibition.startDate)} to ${formatDisplayDate(exhibition.endDate)}` : '20th, 21st & 22nd NOVEMBER, 2026'}</div>
              <div className="font-bold uppercase">VENUE: {exhibition?.venue || 'CODISSIA TRADE CENTRE ( HALL - A & B)'}</div>
              <div className="font-bold uppercase">{exhibition?.city || 'COIMBATORE'}, TN, INDIA.</div>

              <div className="pt-10 text-right italic font-bold pr-4 space-y-0.5">
                <div>OUTPUT CGST</div>
                <div>OUTPUT SGST</div>
              </div>
            </div>

            {/* HSN/SAC */}
            <div className="col-span-2 border-r border-black p-2 text-center">9983</div>

            {/* Quantity */}
            <div className="col-span-1 border-r border-black p-2 text-right font-bold">{totalQty} SQFT</div>

            {/* Per */}
            <div className="col-span-1 border-r border-black p-2 text-center">SQFT</div>

            {/* Amount Column */}
            <div className="col-span-2 p-0 flex flex-col justify-between">
              <div className="p-2 text-right font-bold">{formatMoney(taxableAmount)}</div>
              <div className="border-t border-black p-2 text-right space-y-1">
                <div>{formatMoney(taxableAmount)}</div>
                <div className="font-bold">{formatMoney(cgstAmount)}</div>
                <div className="font-bold">{formatMoney(sgstAmount)}</div>
              </div>
            </div>
          </div>

          {/* Total Row */}
          <div className="grid grid-cols-12 border-t-[1.5px] border-black font-bold p-1">
            <div className="col-span-8 border-r border-black text-right pr-2">Total</div>
            <div className="col-span-1 border-r border-black text-right pr-1">{totalQty}</div>
            <div className="col-span-1 border-r border-black text-center">-</div>
            <div className="col-span-2 text-right pr-1 font-bold text-xs">{formatMoney(grandTotal)}</div>
          </div>
        </div>

        {/* Amount Chargeable (in words) */}
        <div className="flex justify-between items-start p-1.5 border-b-[1.5px] border-black">
          <div>
            <div className="text-[9.5px]">Amount Chargeable (in words)</div>
            <div className="font-bold">{numberToIndianWords(grandTotal)}</div>
          </div>
          <div className="italic text-[10px]">E. & O.E</div>
        </div>

        {/* Tax Table Breakdown */}
        <div className="border-b-[1.5px] border-black text-center text-[10px]">
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black p-1 flex items-center justify-center font-normal">Taxable Value</div>
            <div className="col-span-4 border-r border-black border-b border-black p-0.5">Central Tax</div>
            <div className="col-span-4 border-r border-black border-b border-black p-0.5">State Tax</div>
            <div className="col-span-1 p-1 flex items-center justify-center font-normal">Total Tax Amount</div>
          </div>
          <div className="grid grid-cols-12 border-b border-black text-[9.5px]">
            <div className="col-span-3 border-r border-black"></div>
            <div className="col-span-2 border-r border-black p-0.5">Rate</div>
            <div className="col-span-2 border-r border-black p-0.5">Amount</div>
            <div className="col-span-2 border-r border-black p-0.5">Rate</div>
            <div className="col-span-2 border-r border-black p-0.5">Amount</div>
            <div className="col-span-1"></div>
          </div>
          <div className="grid grid-cols-12 border-b border-black py-1">
            <div className="col-span-3 border-r border-black text-right pr-2">{formatMoney(taxableAmount)}</div>
            <div className="col-span-2 border-r border-black">9 %</div>
            <div className="col-span-2 border-r border-black text-right pr-2">{formatMoney(cgstAmount)}</div>
            <div className="col-span-2 border-r border-black">9 %</div>
            <div className="col-span-2 border-r border-black text-right pr-2">{formatMoney(sgstAmount)}</div>
            <div className="col-span-1 text-right pr-1">{formatMoney(taxAmount)}</div>
          </div>
          <div className="grid grid-cols-12 font-bold py-1">
            <div className="col-span-3 border-r border-black text-right pr-2">Total {formatMoney(taxableAmount)}</div>
            <div className="col-span-2 border-r border-black"></div>
            <div className="col-span-2 border-r border-black text-right pr-2">{formatMoney(cgstAmount)}</div>
            <div className="col-span-2 border-r border-black"></div>
            <div className="col-span-2 border-r border-black text-right pr-2">{formatMoney(sgstAmount)}</div>
            <div className="col-span-1 text-right pr-1">{formatMoney(taxAmount)}</div>
          </div>
        </div>

        {/* Tax Amount in Words */}
        <div className="p-1.5 border-b-[1.5px] border-black">
          Tax Amount (in words) : <span className="font-bold">{numberToIndianWords(taxAmount)}</span>
        </div>

        {/* Bottom Details Footer */}
        <div className="grid grid-cols-2 text-[10px]">
          <div className="p-2 border-r-[1.5px] border-black space-y-1">
            <div className="font-bold">Note:</div>
            <div>All payments should be made by cheque or draft, account payee only and made in favor of Buoyant Media</div>
          </div>
          <div className="p-2 space-y-0.5 leading-snug">
            <div><span className="font-bold">BANK DETAILS</span> : <span className="font-bold">BUOYANT MEDIA</span></div>
            <div>Bank Name : <span className="font-bold">THE FEDERAL BANK LTD</span></div>
            <div>A/C No : <span className="font-bold">18020200001046</span></div>
            <div>Branch & IFSC Code : <span className="font-bold">SAIBABA COLONY & FDRL0001802</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
