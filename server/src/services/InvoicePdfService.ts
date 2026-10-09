// services/InvoicePdfService.ts

import puppeteer from 'puppeteer';

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: Date;

  company: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    gstin?: string;
    contactPerson?: string;
    email?: string;
    mobile?: string;
  };

  exhibition: {
    title: string;
    edition?: string;
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
    branchAndIfsc: string;
  };

  note?: string;
}

export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount <= 0) return 'INR Rupees Zero Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    } else {
      str += a[n];
    }
    return str;
  };

  const convert = (n: number): string => {
    if (n === 0) return '';
    let str = '';

    if (Math.floor(n / 10000000) > 0) {
      str += convert(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (Math.floor(n / 100000) > 0) {
      str += convert(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (Math.floor(n / 1000) > 0) {
      str += convert(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (Math.floor(n / 100) > 0) {
      str += convert(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      str += inWords(n);
    }
    return str;
  };

  const integerPart = Math.floor(amount);
  const words = convert(integerPart).trim();
  return `INR Rupees ${words} Only`;
}

export class InvoicePdfService {
  static buildInvoicePdfData(invoice: any, booking: any): InvoicePdfData {
    const totalGrand = Number(invoice.grandTotal || 0);
    const taxAmt = Number(invoice.taxAmount || 0);
    const baseAmt = Number(invoice.totalAmount || (totalGrand - taxAmt));
    const halfTax = Number((taxAmt / 2).toFixed(2));

    const stalls = (booking?.stalls || []).map((bs: any) => ({
      stallNumber: bs.stall?.stallNumber || bs.stallId || 'A14',
      category: bs.stall?.category || 'PREMIUM',
      areaSqFt: bs.stall?.areaSqFt ?? 100,
      amount: Number(bs.price || bs.stall?.price || 0),
    }));

    return {
      invoiceNumber: invoice.invoiceNumber || '160',
      invoiceDate: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
      company: {
        name: booking?.company?.name || 'Exhibitor Company',
        address: booking?.company?.address || '',
        city: booking?.company?.city || 'COIMBATORE',
        state: booking?.company?.state || 'Tamil Nadu',
        gstin: booking?.company?.gstNumber || undefined,
        contactPerson: booking?.company?.contactPerson || '',
        email: booking?.company?.email || '',
        mobile: booking?.company?.mobile || '',
      },
      exhibition: {
        title: booking?.exhibition?.title || 'MEDICCON EXPO',
        edition: booking?.exhibition?.edition || '4',
        venue: booking?.exhibition?.venue || 'CODISSIA TRADE CENTRE ( HALL - A & B)',
        city: booking?.exhibition?.city || 'COIMBATORE',
        startDate: booking?.exhibition?.startDate ? new Date(booking.exhibition.startDate) : undefined,
        endDate: booking?.exhibition?.endDate ? new Date(booking.exhibition.endDate) : undefined,
      },
      stalls,
      taxableAmount: baseAmt,
      cgstAmount: halfTax,
      sgstAmount: halfTax,
      totalTax: taxAmt,
      grandTotal: totalGrand,
      amountInWords: numberToIndianWords(totalGrand),
      bankDetails: {
        bankName: 'THE FEDERAL BANK LTD',
        accountName: 'BUOYANT MEDIA',
        accountNumber: '18020200001046',
        branchAndIfsc: 'SAIBABA COLONY & FDRL0001802',
      },
      note: 'All payments should be made by cheque or draft, account payee only and made in favor of Buoyant Media',
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
          top: '8mm',
          right: '8mm',
          bottom: '8mm',
          left: '8mm',
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

    const formatOrdinalDate = (date?: Date): string => {
      if (!date) return '';
      const day = date.getDate();
      const monthNames = [
        'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const suffix = (day >= 11 && day <= 13) ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10];
      return `${day}${suffix} ${month}, ${year}`;
    };

    const formatExhibitionDateRange = (): string => {
      if (!data.exhibition.startDate || !data.exhibition.endDate) return '20th, 21st & 22nd NOVEMBER, 2026';
      return `${formatOrdinalDate(data.exhibition.startDate)} to ${formatOrdinalDate(data.exhibition.endDate)}`;
    };

    const primaryStall = data.stalls[0] || {
      stallNumber: 'A14',
      category: 'PREMIUM',
      areaSqFt: 100,
      amount: data.taxableAmount,
    };

    const totalQty = data.stalls.reduce((sum, s) => sum + (s.areaSqFt || 100), 0);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Tax Invoice - ${data.invoiceNumber}</title>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
  }
  .invoice-container {
    width: 100%;
    border: 1.5px solid #000;
    box-sizing: border-box;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  td, th {
    vertical-align: top;
    padding: 4px 6px;
    word-wrap: break-word;
  }
  .bold { font-weight: bold; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .uppercase { text-transform: uppercase; }

  /* Header Box */
  .supplier-box {
    border-right: 1.5px solid #000;
    line-height: 1.35;
  }
  .supplier-name {
    font-weight: bold;
    font-size: 13px;
    margin-bottom: 2px;
  }

  /* Items Table */
  .items-table {
    border-top: 1.5px solid #000;
    border-bottom: 1.5px solid #000;
  }
  .items-table th {
    border-bottom: 1.5px solid #000;
    border-right: 1px solid #000;
    font-weight: normal;
    font-size: 10.5px;
    padding: 5px;
    text-align: center;
  }
  .items-table th:last-child {
    border-right: none;
  }
  .items-table td {
    border-right: 1px solid #000;
    padding: 5px;
  }
  .items-table td:last-child {
    border-right: none;
  }
  .item-desc-title {
    font-weight: bold;
    margin-bottom: 2px;
  }
  .output-tax-indent {
    margin-top: 35px;
    text-align: right;
    font-style: italic;
    font-weight: bold;
    padding-right: 15px;
    line-height: 1.6;
  }

  /* Tax Breakdown Table */
  .tax-table {
    border-top: 1.5px solid #000;
    border-bottom: 1.5px solid #000;
    text-align: center;
    font-size: 10px;
  }
  .tax-table th, .tax-table td {
    border-right: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 4px;
  }
  .tax-table th:last-child, .tax-table td:last-child {
    border-right: none;
  }
  .tax-table tr:last-child td {
    border-bottom: none;
  }

  /* Bottom Details */
  .bottom-table {
    border-top: 1.5px solid #000;
  }
  .bottom-table td {
    padding: 6px;
    line-height: 1.4;
  }
</style>
</head>
<body>

<div class="invoice-container">
  <!-- Top Supplier & Meta Header -->
  <table>
    <tr>
      <!-- Top Left: Supplier Info -->
      <td style="width: 50%;" class="supplier-box">
        <div class="supplier-name">BUOYANT MEDIA</div>
        <div>NO 57A, 2ND FLOOR,</div>
        <div>RAMASAMY STREET, KK PUDUR,</div>
        <div>NSR ROAD, CBE-641038</div>
        <div>MOBILE : 9500288222</div>
        <div>GSTIN : 33ACXPH4512M1ZA</div>
        <div>State Name : Tamil Nadu, Code : 33</div>
      </td>

      <!-- Top Right: Invoice No & Dated -->
      <td style="width: 50%; padding: 0;">
        <table style="height: 100%;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000;">
              <div>Invoice No.</div>
              <div class="bold" style="font-size: 12px; text-decoration: underline; margin-top: 4px;">${data.invoiceNumber}</div>
            </td>
            <td style="width: 50%;">
              <div>Dated</div>
              <div class="bold" style="font-size: 12px; margin-top: 4px;">${formatDate(data.invoiceDate)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Buyer (Bill To) Box -->
  <table style="border-top: 1.5px solid #000;">
    <tr>
      <td style="padding: 6px; line-height: 1.35;">
        <div style="font-size: 10px;">Buyer (Bill To)</div>
        <div class="bold" style="font-size: 13px; margin-top: 2px;">${data.company.name.toUpperCase()}</div>
        <div>${data.company.address ? data.company.address.toUpperCase() : 'NO:115/5, SIVANANDHAPURAM'}</div>
        <div>${data.company.city ? data.company.city.toUpperCase() : 'COIMBATORE'}</div>
        <div>GSTIN/UIN : ${data.company.gstin || '33GWSPS1468G1ZX'}</div>
        <div>State Name  : ${data.company.state || 'Tamil Nadu'}</div>
      </td>
    </tr>
  </table>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 6%;">Sl<br/>No</th>
        <th style="width: 48%;">Description of Goods</th>
        <th style="width: 11%;">HSN/SAC</th>
        <th style="width: 12%;">Quantity</th>
        <th style="width: 8%;">Per</th>
        <th style="width: 15%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr style="height: 240px;">
        <td class="text-right">1</td>
        <td>
          <div class="item-desc-title">STALL NO : ${primaryStall.stallNumber} (${primaryStall.category.toUpperCase()})</div>
          <div class="bold">${primaryStall.areaSqFt || 100} SQFT</div>
          <div class="bold" style="margin-top: 4px;">${data.exhibition.title.toUpperCase()} (EDITION - ${data.exhibition.edition || '1'}),</div>
          <div class="bold">DATE: ${formatExhibitionDateRange()},</div>
          <div class="bold">VENUE: ${data.exhibition.venue.toUpperCase()}</div>
          <div class="bold">${(data.exhibition.city || 'COIMBATORE').toUpperCase()}, TN, INDIA.</div>

          <div class="output-tax-indent">
            <div>OUTPUT CGST</div>
            <div>OUTPUT SGST</div>
          </div>
        </td>
        <td class="text-center">9983</td>
        <td class="text-right bold">${totalQty} SQFT</td>
        <td class="text-center">SQFT</td>
        <td style="padding: 0;">
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="padding: 5px; text-align: right; font-weight: bold;">${formatMoney(data.taxableAmount)}</div>
            <div style="border-top: 1px solid #000; padding: 5px; text-align: right; line-height: 1.6;">
              <div>${formatMoney(data.taxableAmount)}</div>
              <div class="bold">${formatMoney(data.cgstAmount)}</div>
              <div class="bold">${formatMoney(data.sgstAmount)}</div>
            </div>
          </div>
        </td>
      </tr>

      <!-- Total Row -->
      <tr style="border-top: 1.5px solid #000; font-weight: bold;">
        <td colspan="3" class="text-right" style="padding: 5px;">Total</td>
        <td class="text-right" style="padding: 5px;">${totalQty}</td>
        <td class="text-center" style="padding: 5px;">-</td>
        <td class="text-right" style="padding: 5px; font-size: 12px;">${formatMoney(data.grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Amount Chargeable in Words -->
  <table style="border-bottom: 1.5px solid #000;">
    <tr>
      <td style="padding: 5px 6px;">
        <div style="font-size: 9.5px;">Amount Chargeable (in words)</div>
        <div class="bold" style="font-size: 11px;">${data.amountInWords || numberToIndianWords(data.grandTotal)}</div>
      </td>
      <td class="text-right" style="vertical-align: top; font-style: italic; font-size: 10px; width: 80px; padding: 5px 6px;">
        E. & O.E
      </td>
    </tr>
  </table>

  <!-- Tax Breakdown Table -->
  <table class="tax-table">
    <thead>
      <tr>
        <th rowspan="2" style="width: 25%; text-align: center;">Taxable<br/>Value</th>
        <th colspan="2" style="width: 30%;">Central Tax</th>
        <th colspan="2" style="width: 30%;">State Tax</th>
        <th rowspan="2" style="width: 15%; text-align: center;">Total Tax<br/>Amount</th>
      </tr>
      <tr>
        <th style="width: 10%;">Rate</th>
        <th style="width: 20%;">Amount</th>
        <th style="width: 10%;">Rate</th>
        <th style="width: 20%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-right">${formatMoney(data.taxableAmount)}</td>
        <td>9 %</td>
        <td class="text-right">${formatMoney(data.cgstAmount)}</td>
        <td>9 %</td>
        <td class="text-right">${formatMoney(data.sgstAmount)}</td>
        <td class="text-right">${formatMoney(data.totalTax)}</td>
      </tr>
      <tr class="bold">
        <td class="text-right">Total ${formatMoney(data.taxableAmount)}</td>
        <td></td>
        <td class="text-right">${formatMoney(data.cgstAmount)}</td>
        <td></td>
        <td class="text-right">${formatMoney(data.sgstAmount)}</td>
        <td class="text-right">${formatMoney(data.totalTax)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Tax Amount in Words -->
  <div style="padding: 5px 6px; border-bottom: 1.5px solid #000; font-size: 10.5px;">
    Tax Amount (in words) : <span class="bold">${numberToIndianWords(data.totalTax)}</span>
  </div>

  <!-- Note & Bank Details Footer -->
  <table class="bottom-table">
    <tr>
      <td style="width: 50%; border-right: 1.5px solid #000; vertical-align: top;">
        <div class="bold">Note:</div>
        <div style="font-size: 10px;">${data.note || 'All payments should be made by cheque or draft, account payee only and made in favor of Buoyant Media'}</div>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <div><span class="bold">BANK DETAILS</span> : <span class="bold">${data.bankDetails?.accountName || 'BUOYANT MEDIA'}</span></div>
        <div>Bank Name : <span class="bold">${data.bankDetails?.bankName || 'THE FEDERAL BANK LTD'}</span></div>
        <div>A/C No : <span class="bold">${data.bankDetails?.accountNumber || '18020200001046'}</span></div>
        <div>Branch & IFSC Code : <span class="bold">${data.bankDetails?.branchAndIfsc || 'SAIBABA COLONY & FDRL0001802'}</span></div>
      </td>
    </tr>
  </table>
</div>

</body>
</html>`;
  }
}
