import { apiClient } from '../services/api/apiClient';

function dismissToast(toast: HTMLElement | null) {
  if (!toast) return;
  toast.classList.remove('translate-y-0', 'opacity-100');
  toast.classList.add('translate-y-4', 'opacity-0');
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 350);
}

function showDownloadToast(status: 'loading' | 'success' | 'error', filename: string) {
  if (typeof document === 'undefined') return;

  let toast = document.getElementById('global-invoice-download-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-invoice-download-toast';
    document.body.appendChild(toast);
  }

  // Base styling for modern floating notification
  toast.className =
    'fixed bottom-6 right-6 z-[99999] max-w-sm flex items-center gap-3.5 bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border transition-all duration-300 transform translate-y-0 opacity-100 pointer-events-auto';

  if (status === 'loading') {
    toast.style.borderColor = 'rgba(168, 85, 247, 0.45)';
    toast.innerHTML = `
      <div class="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-purple-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <div class="space-y-0.5 pr-2">
        <div class="text-xs font-bold flex items-center gap-1.5 text-slate-100">
          <span>Preparing Official Tax Invoice PDF</span>
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
        </div>
        <div class="text-[11px] text-slate-400">Compiling GST breakdown, HSN items & formatting...</div>
      </div>
    `;
  } else if (status === 'success') {
    toast.style.borderColor = 'rgba(16, 185, 129, 0.45)';
    toast.innerHTML = `
      <div class="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <div class="space-y-0.5 pr-2">
        <div class="text-xs font-bold text-emerald-300">Tax Invoice PDF Ready!</div>
        <div class="text-[11px] text-slate-300 font-mono truncate max-w-[210px]">${filename}</div>
      </div>
    `;
    setTimeout(() => {
      dismissToast(toast);
    }, 2800);
  } else {
    toast.style.borderColor = 'rgba(245, 158, 11, 0.45)';
    toast.innerHTML = `
      <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <div class="space-y-0.5 pr-2">
        <div class="text-xs font-bold text-amber-300">Opening Invoice Viewer</div>
        <div class="text-[11px] text-slate-400">Opening printable web invoice...</div>
      </div>
    `;
    setTimeout(() => {
      dismissToast(toast);
    }, 3200);
  }
}

/**
 * Downloads the official Tax Invoice / Bill PDF for a given booking, payment, or invoice reference.
 * Guarantees that the resulting file is saved strictly as a .pdf file, never as an HTML or JSON document.
 * Displays immediate visual feedback so users know progress is actively occurring.
 */
export async function downloadInvoicePdf(
  target: string | { id?: string; bookingReference?: string; invoice?: { id?: string }; invoices?: Array<{ id?: string }> },
  customFilename?: string
): Promise<void> {
  let idOrReference = '';
  if (typeof target === 'string') {
    idOrReference = target.trim();
  } else if (target && typeof target === 'object') {
    const t = target as any;
    idOrReference =
      t.invoice?.id ||
      t.invoices?.[0]?.id ||
      t.invoiceId ||
      t.invoiceNumber ||
      t.bookingReference ||
      t.paymentReference ||
      t.id ||
      '';
  }

  if (!idOrReference) {
    console.error('Cannot download invoice PDF: missing ID or reference.');
    return;
  }

  // Ensure filename strictly ends with .pdf and has no .html extensions
  let rawName = (customFilename || `Invoice-${idOrReference}`).replace(/\.html?$/i, '').trim();
  if (!rawName.toLowerCase().startsWith('invoice-')) {
    rawName = `Invoice-${rawName}`;
  }
  const safeFilename = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;

  // Immediately inform user that PDF generation is in progress
  showDownloadToast('loading', safeFilename);

  let pdfBlob: Blob | null = null;

  // Primary download path: Authenticated apiClient arraybuffer endpoint
  try {
    const authRes: any = await apiClient.get(`/invoices/${encodeURIComponent(idOrReference)}/pdf`, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    let rawBuffer: ArrayBuffer | null = null;
    if (authRes instanceof ArrayBuffer) {
      rawBuffer = authRes;
    } else if (authRes instanceof Blob) {
      rawBuffer = await authRes.arrayBuffer();
    } else if (authRes?.data instanceof ArrayBuffer) {
      rawBuffer = authRes.data;
    } else if (authRes?.data instanceof Blob) {
      rawBuffer = await authRes.data.arrayBuffer();
    } else if (authRes && typeof authRes.byteLength === 'number') {
      rawBuffer = authRes;
    }

    if (rawBuffer && rawBuffer.byteLength > 0) {
      const uint8 = new Uint8Array(rawBuffer.slice(0, 4));
      const header = String.fromCharCode(...uint8);
      if (header.startsWith('%PDF')) {
        pdfBlob = new Blob([rawBuffer], { type: 'application/pdf' });
      }
    }
  } catch (authErr: any) {
    console.warn('apiClient PDF request attempt failed, trying direct fetch fallback...', authErr);
  }

  // Secondary download path: direct fetch with Bearer token & credentials
  if (!pdfBlob) {
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
      let baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
      if (!baseUrl && typeof window !== 'undefined') {
        baseUrl =
          window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5000/api/v1'
            : '/api/v1';
      }
      baseUrl = baseUrl.trim().replace(/^["']+|["']+$/g, '').replace(/\/$/, '');
      const fetchUrl = `${baseUrl}/invoices/${encodeURIComponent(idOrReference)}/pdf`;

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf && arrayBuf.byteLength > 0) {
          const uint8 = new Uint8Array(arrayBuf.slice(0, 4));
          const header = String.fromCharCode(...uint8);
          if (header.startsWith('%PDF')) {
            pdfBlob = new Blob([arrayBuf], { type: 'application/pdf' });
          }
        }
      }
    } catch (fetchErr) {
      console.warn('Direct fetch PDF request fallback also failed:', fetchErr);
    }
  }

  // 3. If valid PDF blob obtained, trigger native PDF file download
  if (pdfBlob) {
    showDownloadToast('success', safeFilename);

    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 2000);
    return;
  }

  // 4. Fallback safeguard: Never download HTML as a bill.
  // Navigate to invoice page where user can view and print to PDF.
  showDownloadToast('error', safeFilename);
  console.error('Invoice PDF could not be generated as a binary PDF buffer.');
  window.open(`/invoices/${encodeURIComponent(idOrReference)}`, '_blank');
}
