import { apiClient } from '../services/api/apiClient';

export async function downloadInvoicePdf(idOrReference: string, filename?: string): Promise<void> {
  if (!idOrReference) return;
  try {
    const downloadUrl = `/api/v1/invoices/public/${idOrReference}/pdf`;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`PDF download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Invoice-${idOrReference}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Failed to download invoice PDF:', err);
    // Fallback attempt with authenticated apiClient blob response if public fetch failed
    try {
      const authRes = await apiClient.get(`/invoices/${idOrReference}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([authRes.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `Invoice-${idOrReference}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (fallbackErr) {
      console.error('Fallback PDF download also failed:', fallbackErr);
      // As last resort, open invoice detail page or public pdf URL in a new tab
      window.open(`/api/v1/invoices/public/${idOrReference}/pdf`, '_blank');
    }
  }
}
