// services/InvoicePdfService.ts

import puppeteer from 'puppeteer';

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: Date;

  company: {
    name: string;
    address?: string;
    gstin?: string;
    state?: string;
    contactPerson?: string;
    email?: string;
    mobile?: string;
  };

  exhibition: {
    title: string;
    venue: string;
    city: string;
    startDate?: Date;
    endDate?: Date;
  };

  stalls: {
    stallNumber: string;
    category: string;
    areaSqFt?: number;
    amount: number;
  }[];

  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  grandTotal: number;

  amountInWords?: string;

  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
  };

  note?: string;
}

export class InvoicePdfService {
  static buildInvoicePdfData(invoice: any, booking: any): InvoicePdfData {
    const totalGrand = Number(invoice.grandTotal || 0);
    const taxAmt = Number(invoice.taxAmount || 0);
    const baseAmt = Number(invoice.totalAmount || (totalGrand - taxAmt));
    const halfTax = Number((taxAmt / 2).toFixed(2));

    const stalls = (booking.stalls || []).map((bs: any) => ({
      stallNumber: bs.stall?.stallNumber || bs.stallId || 'N/A',
      category: bs.stall?.category || 'STANDARD',
      areaSqFt: bs.stall?.areaSqFt ?? 100,
      amount: Number(bs.price || bs.stall?.price || 0),
    }));

    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
      company: {
        name: booking.company?.name || 'Exhibitor',
        address: booking.company?.address || '',
        gstin: booking.company?.gstNumber || undefined,
        state: booking.company?.state || '',
        contactPerson: booking.company?.contactPerson || '',
        email: booking.company?.email || '',
        mobile: booking.company?.mobile || '',
      },
      exhibition: {
        title: booking.exhibition?.title || 'Exhibition',
        venue: booking.exhibition?.venue || 'Convention Center',
        city: booking.exhibition?.city || '',
        startDate: booking.exhibition?.startDate ? new Date(booking.exhibition.startDate) : undefined,
        endDate: booking.exhibition?.endDate ? new Date(booking.exhibition.endDate) : undefined,
      },
      stalls,
      taxableAmount: baseAmt,
      cgstAmount: halfTax,
      sgstAmount: halfTax,
      totalTax: taxAmt,
      grandTotal: totalGrand,
      bankDetails: {
        bankName: 'HDFC Bank',
        accountName: 'BUOYANT MEDIA PRIVATE LIMITED',
        accountNumber: '50200012345678',
        ifsc: 'HDFC0001234',
      },
      note: 'Thank you for booking with Buoyant Media.',
    };
  }

  static async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    const html = this.buildInvoiceHtml(data);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'load',
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private static buildInvoiceHtml(data: InvoicePdfData): string {
    const formatMoney = (amount: number): string =>
      amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const formatDate = (date?: Date): string => {
      if (!date) return '-';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatExhibitionDate = (): string => {
      const startDate = data.exhibition.startDate ? formatDate(data.exhibition.startDate) : '-';
      const endDate = data.exhibition.endDate ? formatDate(data.exhibition.endDate) : '-';
      if (startDate === '-' && endDate === '-') return '-';
      return `${startDate} - ${endDate}`;
    };

    const stallRows = data.stalls
      .map(
        (stall, index) => `
        <tr class="stall-row">
          <td class="sl-no center">${index + 1}</td>
          <td class="description-cell">
            <div class="description-content">
              <strong>STALL NO : ${stall.stallNumber} (${stall.category.toUpperCase()})</strong><br/>
              ${stall.areaSqFt ?? '-'} SQFT<br/>
              <strong>${data.exhibition.title.toUpperCase()}</strong><br/>
              DATE: ${formatExhibitionDate()}<br/>
              VENUE: ${data.exhibition.venue.toUpperCase()}${data.exhibition.city ? `, ${data.exhibition.city.toUpperCase()}` : ''}
            </div>
            ${
              index === 0
                ? `
              <div class="output-tax-labels">
                <div>OUTPUT CGST (9%)</div>
                <div>OUTPUT SGST (9%)</div>
              </div>
            `
                : ''
            }
          </td>
          <td class="hsn-cell">9983</td>
          <td class="quantity-cell center bold">${stall.areaSqFt ?? '-'} SQFT</td>
          <td class="per-cell center">SQFT</td>
          <td class="amount-cell">
            <div class="amount-stack">
              <div class="amount-line first-amount-line">${formatMoney(data.taxableAmount)}</div>
              ${
                index === 0
                  ? `
                <div class="amount-tax-breakdown">
                  <div class="amount-line">${formatMoney(data.taxableAmount)}</div>
                  <div class="amount-line">${formatMoney(data.cgstAmount)}</div>
                  <div class="amount-line">${formatMoney(data.sgstAmount)}</div>
                </div>
              `
                  : ''
              }
            </div>
          </td>
        </tr>
      `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; background: #fff; }
  .invoice { width: 100%; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td, th { border: 1px solid #333; padding: 4px; vertical-align: top; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .header-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .company-cell { width: 52%; padding: 0; vertical-align: top; }
  .company-details { min-height: 105px; padding: 7px; line-height: 1.35; border-bottom: 1px solid #333; }
  .company-name { font-size: 13px; font-weight: bold; margin-bottom: 3px; }
  .buyer-details { min-height: 90px; padding: 7px; line-height: 1.35; }
  .invoice-info-cell { width: 48%; padding: 0; vertical-align: top; }
  .invoice-meta-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .invoice-meta-table td { border: none; padding: 3px; vertical-align: top; height: 90px; }
  .invoice-meta-table td:first-child { width: 50%; border-right: 1px solid #333; }
  .invoice-meta-table td:last-child { width: 50%; }
  .items-table th { text-align: center; vertical-align: middle; font-weight: bold; height: 32px; }
  .sl-col { width: 6%; }
  .description-col { width: 46%; }
  .hsn-col { width: 9%; }
  .quantity-col { width: 12%; }
  .per-col { width: 9%; }
  .amount-col { width: 18%; }
  .stall-row { height: 200px; }
  .amount-stack { width: 100%; display: flex; flex-direction: column; justify-content: flex-start; }
  .amount-line { padding: 5px; text-align: right; font-weight: bold; }
  .first-amount-line { height: 90px; display: flex; align-items: flex-start; justify-content: flex-end; border-bottom: 1px solid #333; }
  .amount-tax-breakdown .amount-line { height: 25px; }
  .total-row { font-weight: bold; font-size: 11px; background: #f9f9f9; }
</style>
</head>
<body>
<div class="invoice">
  <div style="text-align: right; font-size: 9px; font-style: italic; margin-bottom: 4px;">Tax Invoice / Original for Recipient</div>
  <table class="header-table">
    <tr>
      <td class="company-cell">
        <div class="company-details">
          <div class="company-name">BUOYANT MEDIA PRIVATE LIMITED</div>
          <div>Metropolitan Building, Suite 402<br/>San Francisco, CA / Bengaluru, India<br/>GSTIN: 29AAACB1234F1Z5 | PAN: AAACB1234F</div>
        </div>
        <div class="buyer-details">
          <div class="bold">Billed To (Exhibitor):</div>
          <div class="bold" style="font-size:11px;">${data.company.name}</div>
          <div>${data.company.address || 'Address Not Provided'}</div>
          <div>GSTIN: ${data.company.gstin || 'N/A'} | State: ${data.company.state || 'N/A'}</div>
          <div>Contact: ${data.company.contactPerson} (${data.company.email})</div>
        </div>
      </td>
      <td class="invoice-info-cell">
        <table class="invoice-meta-table">
          <tr>
            <td>
              <span class="bold">Invoice No:</span><br/>
              <span style="font-size:12px; font-weight:bold;">${data.invoiceNumber}</span><br/><br/>
              <span class="bold">Invoice Date:</span><br/>
              <span>${formatDate(data.invoiceDate)}</span>
            </td>
            <td>
              <span class="bold">Payment Mode:</span><br/>
              <span>ONLINE (Razorpay)</span><br/><br/>
              <span class="bold">Place of Supply:</span><br/>
              <span>${data.exhibition.city || 'India'}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th class="sl-col">Sl No</th>
        <th class="description-col">Description of Goods / Services</th>
        <th class="hsn-col">HSN/SAC</th>
        <th class="quantity-col">Quantity</th>
        <th class="per-col">Per</th>
        <th class="amount-col">Amount (INR)</th>
      </tr>
    </thead>
    <tbody>
      ${stallRows}
      <tr class="total-row">
        <td colspan="5" class="right bold">TOTAL TAXABLE AMOUNT:</td>
        <td class="right font-mono">${formatMoney(data.taxableAmount)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="5" class="right bold">TOTAL TAX (CGST + SGST 18%):</td>
        <td class="right font-mono">${formatMoney(data.totalTax)}</td>
      </tr>
      <tr class="total-row" style="font-size:12px; background:#eef4fc;">
        <td colspan="5" class="right bold">GRAND TOTAL:</td>
        <td class="right font-mono bold" style="color:#012970;">₹${formatMoney(data.grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 15px; padding: 8px; border: 1px solid #333; font-size: 9px;">
    <div class="bold">Bank Details for Direct Transfers:</div>
    <div>Bank Name: ${data.bankDetails?.bankName || 'HDFC Bank'} | Account Name: ${data.bankDetails?.accountName}</div>
    <div>Account Number: ${data.bankDetails?.accountNumber} | IFSC Code: ${data.bankDetails?.ifsc}</div>
  </div>
</div>
</body>
</html>
    `;
  }
}
