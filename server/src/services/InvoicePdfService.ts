// services/InvoicePdfService.ts

import pdfmake from 'pdfmake';
import { ApiError } from '../utils/apiError.js';

// Restrict external URL fetches for security
pdfmake.setUrlAccessPolicy(() => false);
// Allow standard font definitions
pdfmake.setLocalAccessPolicy(() => true);

pdfmake.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: Date;

  company: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    country?: string;
    gstin?: string;
    pan?: string;
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
  isTamilNadu: boolean;
  stalls: {
    stallNumber: string;
    category: string;
    areaSqFt?: number;
    name: string | null;
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

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += singleDigits[n] + ' ';
    }
    return str;
  };

  const convert = (n: number): string => {
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

// ---------------------------------------------------------------------------
// Concurrency & Queuing Management
// ---------------------------------------------------------------------------
let activeRenders = 0;
export const MAX_CONCURRENT_PDF_RENDERS = 10;
export const MAX_RENDER_QUEUE_SIZE = 50;
export const QUEUE_WAIT_TIMEOUT_MS = 15000;

interface QueueItem {
  resolve: (release: () => void) => void;
  reject: (err: any) => void;
  timer: NodeJS.Timeout;
  isCancelled: boolean;
}

const renderQueue: QueueItem[] = [];

export async function acquirePdfRenderSlot(timeoutMs: number = QUEUE_WAIT_TIMEOUT_MS): Promise<() => void> {
  if (activeRenders < MAX_CONCURRENT_PDF_RENDERS) {
    activeRenders++;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        releasePdfRenderSlot();
      }
    };
  }

  if (renderQueue.length >= MAX_RENDER_QUEUE_SIZE) {
    throw ApiError.serviceUnavailable(
      'PDF generation service is currently at maximum capacity. Please try again shortly.'
    );
  }

  return new Promise<() => void>((resolve, reject) => {
    let item: QueueItem;

    const timer = setTimeout(() => {
      item.isCancelled = true;
      const idx = renderQueue.indexOf(item);
      if (idx !== -1) {
        renderQueue.splice(idx, 1);
      }
      reject(
        ApiError.serviceUnavailable(
          'PDF generation request timed out while waiting for an available rendering slot.'
        )
      );
    }, timeoutMs);

    item = {
      resolve: (release) => {
        clearTimeout(timer);
        resolve(release);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
      timer,
      isCancelled: false,
    };

    renderQueue.push(item);
  });
}

export function releasePdfRenderSlot() {
  activeRenders = Math.max(0, activeRenders - 1);

  while (renderQueue.length > 0) {
    const next = renderQueue.shift();
    if (next && !next.isCancelled) {
      activeRenders++;
      let released = false;
      const releaseCb = () => {
        if (!released) {
          released = true;
          releasePdfRenderSlot();
        }
      };
      next.resolve(releaseCb);
      return;
    }
  }
}

export function getActivePdfRendersCount(): number {
  return activeRenders;
}

export function getRenderQueueLength(): number {
  return renderQueue.length;
}

export function resetRenderQueueForTesting(): void {
  activeRenders = 0;
  while (renderQueue.length > 0) {
    const item = renderQueue.shift();
    if (item) {
      clearTimeout(item.timer);
      item.isCancelled = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

const formatExhibitionDateRange = (ex: { startDate?: Date; endDate?: Date }): string => {
  if (!ex.startDate || !ex.endDate) return '20th, 21st & 22nd NOVEMBER, 2026';
  return `${formatOrdinalDate(ex.startDate)} to ${formatOrdinalDate(ex.endDate)}`;
};

export class InvoicePdfService {
  /**
   * Builds the invoice PDF rendering data payload.
   * Prioritizes the immutable point-in-time Booking snapshots (Phase 2.3/2.4)
   * with field-by-field fallback to the associated Master Company profile.
   */
  static buildInvoicePdfData(invoice: any, booking: any): InvoicePdfData {
    const totalGrand = Number(invoice.grandTotal || 0);
    const taxAmt = Number(invoice.taxAmount || 0);
    const baseAmt = Number(invoice.totalAmount || (totalGrand - taxAmt));
    const halfTax = Number((taxAmt / 2).toFixed(2));

    const stalls = (booking?.stalls || []).map((bs: any) => ({
      stallNumber: bs.stall?.stallNumber || bs.stallId || 'A14',
      category: bs.stall?.category || 'PREMIUM',
      areaSqFt: bs.stall?.areaSqFt ?? 100,
      name: bs.stall?.name || '',
      amount: Number(bs.price || bs.stall?.price || 0),
    }));

    // Precedence: Immutable Booking Snapshots -> Associated Company profile -> Invoice Company fallback
    const comp = booking?.company || invoice?.company || {};

    const billingName = (booking?.billingName && booking.billingName.trim()) || comp.name || 'Exhibitor Company';
    const billingGst = (booking?.billingGst && booking.billingGst.trim()) || comp.gstNumber || undefined;
    const billingPan = (booking?.billingPan && booking.billingPan.trim()) || comp.panNumber || undefined;
    const billingAddress = (booking?.billingAddress && booking.billingAddress.trim()) || comp.address || '';
    const billingCity = (booking?.billingCity && booking.billingCity.trim()) || comp.city || '';
    const billingState = (booking?.billingState && booking.billingState.trim()) || comp.state || '';
    const billingPinCode = (booking?.billingPinCode && booking.billingPinCode.trim()) || comp.pinCode || '';
    const billingCountry = (booking?.billingCountry && booking.billingCountry.trim()) || comp.country || 'India';

    const contactPerson = (booking?.contactPerson && booking.contactPerson.trim()) || comp.contactPerson || '';
    const contactEmail = (booking?.contactEmail && booking.contactEmail.trim()) || comp.email || '';
    const contactPhone = (booking?.contactPhone && booking.contactPhone.trim()) || comp.mobile || '';
    const buyerState = String(comp?.state || '').trim().toLowerCase();
    const isTamilNadu = buyerState === 'tamil nadu';

    return {
      invoiceNumber: invoice.invoiceNumber || '160',
      invoiceDate: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
      company: {
        name: billingName,
        address: billingAddress,
        city: billingCity,
        state: billingState,
        pinCode: billingPinCode,
        country: billingCountry,
        gstin: billingGst,
        pan: billingPan,
        contactPerson,
        email: contactEmail,
        mobile: contactPhone,
      },
      exhibition: {
        title: booking?.exhibition?.title || 'MEDICCON EXPO',
        edition: booking?.exhibition?.edition || '4',
        venue: booking?.exhibition?.venue || 'CODISSIA TRADE CENTRE ( HALL - A & B)',
        city: booking?.exhibition?.city || 'COIMBATORE',
        startDate: booking?.exhibition?.startDate ? new Date(booking.exhibition.startDate) : undefined,
        endDate: booking?.exhibition?.endDate ? new Date(booking.exhibition.endDate) : undefined,
      },
      isTamilNadu,
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

  /**
   * Generates a high-performance, exact-layout PDF invoice buffer using pdfmake.
   * Completely eliminated headless browser / Puppeteer dependency.
   */
  static async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    const releaseSlot = await acquirePdfRenderSlot();
    try {
      const docDef = this.buildDocDefinition(data);
      const pdfDoc = pdfmake.createPdf(docDef);
      const buffer = await pdfDoc.getBuffer();
      return buffer;
    } finally {
      releaseSlot();
    }
  }

  /**
   * Builds the declarative pdfmake document definition matching the original invoice layout.
   */
  static buildDocDefinition(data: InvoicePdfData): any {
    const stallDetailsText = data.stalls
      .map((s) => `${s.stallNumber} (${s.category.toUpperCase()}) ${s.name || ''}`.trim())
      .join(', ');

    const totalQty = data.stalls.reduce((sum, s) => sum + (s.areaSqFt || 100), 0);

    const tableNoPadding = {
      hLineWidth: () => 0.75,
      vLineWidth: () => 0.75,
      hLineColor: () => '#000000',
      vLineColor: () => '#000000',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    };

    const tableWithPadding = {
      hLineWidth: () => 0.75,
      vLineWidth: () => 0.75,
      hLineColor: () => '#000000',
      vLineColor: () => '#000000',
      paddingLeft: () => 5,
      paddingRight: () => 5,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    };

    return {
      pageSize: 'A4' as const,
      pageMargins: [22.6, 22.6, 22.6, 22.6] as [number, number, number, number],
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 8.5,
        lineHeight: 1.25,
        color: '#000000',
      },
      content: [
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    // 1. TOP HEADER (Supplier & Buyer + Invoice Info)
                    {
                      table: {
                        widths: ['50%', '50%'],
                        body: [
                          [
                            // Left column: Supplier on top, Buyer below
                            {
                              stack: [
                                // Supplier
                                {
                                  stack: [
                                    { text: 'BUOYANT MEDIA', bold: true, fontSize: 10 },
                                    { text: 'NO 57A, 2ND FLOOR,' },
                                    { text: 'RAMASAMY STREET, KK PUDUR,' },
                                    { text: 'NSR ROAD, CBE-641038' },
                                    { text: 'MOBILE : 9500288222' },
                                    { text: 'GSTIN : 33ACXPH4512M1ZA' },
                                    { text: 'State Name : Tamil Nadu, Code : 33' },
                                  ],
                                  margin: [6, 6, 6, 6],
                                },
                                // Divider line
                                {
                                  canvas: [
                                    { type: 'line', x1: 0, y1: 0, x2: 275, y2: 0, lineWidth: 0.75, lineColor: '#000' },
                                  ],
                                },
                                // Buyer
                                {
                                  stack: [
                                    { text: 'Buyer (Bill To)', fontSize: 7.5 },
                                    {
                                      text: (data.company.name || 'EXHIBITOR COMPANY').toUpperCase(),
                                      bold: true,
                                      fontSize: 10,
                                      margin: [0, 2, 0, 2],
                                    },
                                    data.company.address ? { text: data.company.address.toUpperCase() } : {},
                                    {
                                      text: [data.company.city, data.company.state, data.company.pinCode]
                                        .filter(Boolean)
                                        .join(', ')
                                        .toUpperCase(),
                                    },
                                    { text: `GSTIN/UIN : ${data.company.gstin || 'URP'}` },
                                    data.company.pan ? { text: `PAN : ${data.company.pan.toUpperCase()}` } : {},
                                    data.company.contactPerson ? { text: `Contact Person : ${data.company.contactPerson}` } : {},
                                    data.company.mobile || data.company.email
                                      ? { text: `Contact : ${[data.company.mobile, data.company.email].filter(Boolean).join(' | ')}` }
                                      : {},
                                    { text: `State Name : ${data.company.state || 'Tamil Nadu'}` },
                                  ],
                                  margin: [6, 6, 6, 6],
                                },
                              ],
                              border: [false, false, true, false],
                            },
                            // Right column: Invoice No & Date + Space below
                            {
                              stack: [
                                // Top split: Invoice No | Dated
                                {
                                  table: {
                                    widths: ['50%', '50%'],
                                    body: [
                                      [
                                        {
                                          stack: [
                                            { text: 'Invoice No.', fontSize: 7.5 },
                                            { text: data.invoiceNumber, bold: true, fontSize: 9.5, margin: [0, 2, 0, 0] },
                                          ],
                                          margin: [6, 6, 6, 6],
                                          border: [false, false, true, true],
                                        },
                                        {
                                          stack: [
                                            { text: 'Dated', fontSize: 7.5 },
                                            { text: formatDate(data.invoiceDate), bold: true, fontSize: 9.5, margin: [0, 2, 0, 0] },
                                          ],
                                          margin: [6, 6, 6, 6],
                                          border: [false, false, false, true],
                                        },
                                      ],
                                    ],
                                  },
                                  layout: tableNoPadding,
                                },
                                // Empty bottom space
                                {
                                  text: '',
                                  margin: [0, 100, 0, 0],
                                },
                              ],
                              border: [false, false, false, false],
                            },
                          ],
                        ],
                      },
                      layout: tableNoPadding,
                    },

                    // 2. ITEMS TABLE
                    {
                      table: {
                        widths: ['6%', '48%', '11%', '12%', '8%', '15%'],
                        body: [
                          // Headers
                          [
                            { text: 'Sl\nNo', alignment: 'center', fontSize: 8, border: [false, true, true, true] },
                            { text: 'Description of Goods', alignment: 'center', fontSize: 8, border: [false, true, true, true] },
                            { text: 'HSN/SAC', alignment: 'center', fontSize: 8, border: [false, true, true, true] },
                            { text: 'Quantity', alignment: 'center', fontSize: 8, border: [false, true, true, true] },
                            { text: 'Per', alignment: 'center', fontSize: 8, border: [false, true, true, true] },
                            { text: 'Amount', alignment: 'center', fontSize: 8, border: [false, true, false, true] },
                          ],
                          // Body Row
                          [
                            { text: '1', alignment: 'right', border: [false, false, true, true] },
                            {
                              stack: [
                                { text: `STALL NO:${stallDetailsText}`, bold: true },
                                {
                                  text: `${data.exhibition.title.toUpperCase()} (EDITION - ${data.exhibition.edition || '1'}),`,
                                  bold: true,
                                  margin: [0, 4, 0, 0],
                                },
                                { text: `DATE: ${formatExhibitionDateRange(data.exhibition)},`, bold: true },
                                { text: `VENUE: ${data.exhibition.venue.toUpperCase()}`, bold: true },
                                { text: `${(data.exhibition.city || 'COIMBATORE').toUpperCase()}, TN, INDIA.`, bold: true },
                                // Output Tax indent
                                {
                                  text: data.isTamilNadu ? 'OUTPUT CGST\nOUTPUT SGST' : 'OUTPUT IGST',
                                  alignment: 'right',
                                  bold: true,
                                  italics: true,
                                  margin: [0, 30, 10, 0],
                                  lineHeight: 1.4,
                                },
                              ],
                              border: [false, false, true, true],
                            },
                            { text: '', border: [false, false, true, true] },
                            { text: `${totalQty} SQM`, bold: true, alignment: 'right', border: [false, false, true, true] },
                            { text: 'SQM', alignment: 'center', border: [false, false, true, true] },
                            {
                              stack: [
                                { text: formatMoney(data.taxableAmount), bold: true, alignment: 'right' },
                                {
                                  canvas: [
                                    { type: 'line', x1: 0, y1: 50, x2: 80, y2: 50, lineWidth: 0.75, lineColor: '#000' },
                                  ],
                                },
                                {
                                  text: data.isTamilNadu
                                    ? `\n\n\n\n${formatMoney(data.taxableAmount)}\n${formatMoney(data.cgstAmount)}\n${formatMoney(data.sgstAmount)}`
                                    : `\n\n\n\n${formatMoney(data.taxableAmount)}\n${formatMoney(data.totalTax)}`,
                                  alignment: 'right',
                                  bold: true,
                                  lineHeight: 1.4,
                                },
                              ],
                              border: [false, false, false, true],
                            },
                          ],
                          // Total Row
                          [
                            { text: '', border: [false, false, true, true] },
                            { text: 'Total', alignment: 'right', bold: true, border: [false, false, true, true] },
                            { text: '', border: [false, false, true, true] },
                            { text: `${totalQty}`, alignment: 'right', bold: true, border: [false, false, true, true] },
                            { text: '-', alignment: 'center', border: [false, false, true, true] },
                            {
                              text: formatMoney(data.grandTotal),
                              alignment: 'right',
                              bold: true,
                              fontSize: 9.5,
                              border: [false, false, false, true],
                            },
                          ],
                        ],
                      },
                      layout: tableWithPadding,
                    },

                    // 3. AMOUNT CHARGEABLE IN WORDS
                    {
                      table: {
                        widths: ['85%', '15%'],
                        body: [
                          [
                            {
                              stack: [
                                { text: 'Amount Chargeable (in words)', fontSize: 7.5 },
                                { text: data.amountInWords || 'INR Rupees Zero Only', bold: true, fontSize: 9 },
                              ],
                              border: [false, false, false, true],
                              margin: [6, 4, 6, 4],
                            },
                            {
                              text: 'E. & O.E',
                              italics: true,
                              alignment: 'right',
                              fontSize: 8,
                              border: [false, false, false, true],
                              margin: [6, 4, 6, 4],
                            },
                          ],
                        ],
                      },
                      layout: tableNoPadding,
                    },

                    // 4. TAX BREAKDOWN TABLE
                    {
                      table: {
                        widths: data.isTamilNadu
                          ? ['25%', '10%', '20%', '10%', '20%', '15%']
                          : ['25%', '20%', '35%', '20%'],
                        body: data.isTamilNadu
                          ? [
                              // Header Row 1
                              [
                                { text: 'Taxable\nValue', rowSpan: 2, alignment: 'center', bold: true, border: [false, false, true, true] },
                                { text: 'Central Tax', colSpan: 2, alignment: 'center', bold: true, border: [false, false, true, true] },
                                {},
                                { text: 'State Tax', colSpan: 2, alignment: 'center', bold: true, border: [false, false, true, true] },
                                {},
                                { text: 'Total\nTax Amount', rowSpan: 2, alignment: 'center', bold: true, border: [false, false, false, true] },
                              ],
                              // Header Row 2
                              [
                                {},
                                { text: 'Rate', alignment: 'center', bold: true, border: [false, false, true, true] },
                                { text: 'Amount', alignment: 'center', bold: true, border: [false, false, true, true] },
                                { text: 'Rate', alignment: 'center', bold: true, border: [false, false, true, true] },
                                { text: 'Amount', alignment: 'center', bold: true, border: [false, false, true, true] },
                                {},
                              ],
                              // Data Row
                              [
                                { text: formatMoney(data.taxableAmount), alignment: 'right', border: [false, false, true, true] },
                                { text: '9 %', alignment: 'center', border: [false, false, true, true] },
                                { text: formatMoney(data.cgstAmount), alignment: 'right', border: [false, false, true, true] },
                                { text: '9 %', alignment: 'center', border: [false, false, true, true] },
                                { text: formatMoney(data.sgstAmount), alignment: 'right', border: [false, false, true, true] },
                                { text: formatMoney(data.totalTax), alignment: 'right', border: [false, false, false, true] },
                              ],
                              // Total Row
                              [
                                { text: `Total ${formatMoney(data.taxableAmount)}`, alignment: 'right', bold: true, border: [false, false, true, true] },
                                { text: '', border: [false, false, true, true] },
                                { text: formatMoney(data.cgstAmount), alignment: 'right', bold: true, border: [false, false, true, true] },
                                { text: '', border: [false, false, true, true] },
                                { text: formatMoney(data.sgstAmount), alignment: 'right', bold: true, border: [false, false, true, true] },
                                { text: formatMoney(data.totalTax), alignment: 'right', bold: true, border: [false, false, false, true] },
                              ],
                            ]
                          : [
                              // IGST Headers
                              [
                                { text: 'Taxable\nValue', rowSpan: 2, alignment: 'center', bold: true, border: [false, false, true, true] },
                                { text: 'Tax', colSpan: 2, alignment: 'center', bold: true, border: [false, false, true, true] },
                                {},
                                { text: 'Total\nTax Amount', rowSpan: 2, alignment: 'center', bold: true, border: [false, false, false, true] },
                              ],
                              [
                                {},
                                { text: 'Rate', alignment: 'center', bold: true, border: [false, false, true, true] },
                                { text: 'Amount', alignment: 'center', bold: true, border: [false, false, true, true] },
                                {},
                              ],
                              [
                                { text: formatMoney(data.taxableAmount), alignment: 'right', border: [false, false, true, true] },
                                { text: '18 %', alignment: 'center', border: [false, false, true, true] },
                                { text: formatMoney(data.totalTax), alignment: 'right', border: [false, false, true, true] },
                                { text: formatMoney(data.totalTax), alignment: 'right', border: [false, false, false, true] },
                              ],
                              [
                                { text: `Total ${formatMoney(data.taxableAmount)}`, alignment: 'right', bold: true, border: [false, false, true, true] },
                                { text: '', border: [false, false, true, true] },
                                { text: formatMoney(data.totalTax), alignment: 'right', bold: true, border: [false, false, true, true] },
                                { text: formatMoney(data.totalTax), alignment: 'right', bold: true, border: [false, false, false, true] },
                              ],
                            ],
                      },
                      layout: tableWithPadding,
                    },

                    // 5. TAX AMOUNT IN WORDS
                    {
                      table: {
                        widths: ['*'],
                        body: [
                          [
                            {
                              text: [
                                { text: 'Tax Amount (in words) : ' },
                                { text: data.amountInWords || numberToIndianWords(data.totalTax), bold: true },
                              ],
                              border: [false, false, false, true],
                              margin: [6, 4, 6, 4],
                            },
                          ],
                        ],
                      },
                      layout: tableNoPadding,
                    },

                    // 6. BOTTOM TABLE (Note & Bank Details)
                    {
                      table: {
                        widths: ['50%', '50%'],
                        body: [
                          [
                            // Left: Note
                            {
                              stack: [
                                { text: 'Note:', bold: true },
                                {
                                  text:
                                    data.note ||
                                    'All payments should be made by cheque or draft, account payee only and made in favor of Buoyant Media',
                                  fontSize: 8,
                                },
                              ],
                              margin: [6, 6, 6, 6],
                              border: [false, false, true, false],
                            },
                            // Right: Bank details & Signature
                            {
                              stack: [
                                {
                                  stack: [
                                    {
                                      text: [
                                        { text: 'BANK DETAILS : ', bold: true },
                                        { text: data.bankDetails?.accountName || 'BUOYANT MEDIA', bold: true },
                                      ],
                                    },
                                    {
                                      text: [
                                        { text: 'Bank Name : ' },
                                        { text: data.bankDetails?.bankName || 'THE FEDERAL BANK LTD', bold: true },
                                      ],
                                    },
                                    {
                                      text: [
                                        { text: 'A/C No : ' },
                                        { text: data.bankDetails?.accountNumber || '18020200001046', bold: true },
                                      ],
                                    },
                                    {
                                      text: [
                                        { text: 'Branch & IFSC Code : ' },
                                        { text: data.bankDetails?.branchAndIfsc || 'SAIBABA COLONY & FDRL0001802', bold: true },
                                      ],
                                    },
                                  ],
                                  margin: [6, 6, 6, 6],
                                },
                                // Divider line
                                {
                                  canvas: [
                                    { type: 'line', x1: 0, y1: 0, x2: 275, y2: 0, lineWidth: 0.75, lineColor: '#000' },
                                  ],
                                },
                                // Empty space for seal / signature
                                {
                                  text: '',
                                  margin: [0, 40, 0, 0],
                                },
                              ],
                              border: [false, false, false, false],
                            },
                          ],
                        ],
                      },
                      layout: tableNoPadding,
                    },
                  ],
                  border: [true, true, true, true], // outer bounding box
                },
              ],
            ],
          },
          layout: tableNoPadding,
        },
      ],
    };
  }
}
