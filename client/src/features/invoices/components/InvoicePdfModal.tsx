import React, { useEffect, useState, useRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import { apiClient } from '../../../services/api/apiClient';
import {
  FileText,
  Download,
  ExternalLink,
  Printer,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export interface InvoicePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetIdOrReference: string | null;
  invoiceNumber?: string;
  title?: string;
}

export const InvoicePdfModal: React.FC<InvoicePdfModalProps> = ({
  isOpen,
  onClose,
  targetIdOrReference,
  invoiceNumber,
  title,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!isOpen || !targetIdOrReference) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const fetchPdfBlob = async () => {
      setLoading(true);
      setError(null);

      try {
        let pdfBlob: Blob | null = null;

        // Primary authenticated call via apiClient
        try {
          const authRes: any = await apiClient.get(
            `/invoices/${encodeURIComponent(targetIdOrReference)}/pdf`,
            {
              responseType: 'arraybuffer',
              timeout: 30000,
            }
          );

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
        } catch (apiErr) {
          console.warn('apiClient PDF blob fetch failed, falling back to direct fetch...', apiErr);
        }

        // Secondary fallback via direct fetch with token
        if (!pdfBlob) {
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
          let baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
          if (!baseUrl && typeof window !== 'undefined') {
            baseUrl =
              window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:5000/api/v1'
                : '/api/v1';
          }
          baseUrl = baseUrl.trim().replace(/^["']+|["']+$/g, '').replace(/\/$/, '');
          const fetchUrl = `${baseUrl}/invoices/${encodeURIComponent(targetIdOrReference)}/pdf`;

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
        }

        if (cancelled) return;

        if (!pdfBlob || pdfBlob.size === 0) {
          throw new Error('Unable to retrieve official PDF buffer from the server.');
        }

        objectUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(objectUrl);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load invoice PDF for viewing:', err);
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to load the official invoice PDF.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPdfBlob();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, targetIdOrReference]);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.open print:', e);
      }
    }
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleDownload = async () => {
    if (!targetIdOrReference) return;
    setIsDownloading(true);
    try {
      await downloadInvoicePdf(
        targetIdOrReference,
        invoiceNumber ? `Invoice-${invoiceNumber}.pdf` : undefined
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const modalTitle = title || `Official Tax Invoice & Bill${invoiceNumber ? `: ${invoiceNumber}` : ''}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="6xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>OFFICIAL GST TAX INVOICE</span>
            </span>
            {invoiceNumber && (
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                {invoiceNumber}
              </span>
            )}
            <span className="hidden sm:inline-flex text-[11px] text-slate-500 dark:text-slate-400 italic">
              Exact 1:1 view of downloaded PDF
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pdfUrl && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  leftIcon={<Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
                  className="text-xs"
                  title="Print this invoice directly"
                >
                  Print
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(pdfUrl, '_blank')}
                  leftIcon={<ExternalLink className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
                  className="text-xs"
                  title="Open PDF in new tab"
                >
                  Full Page
                </Button>
              </>
            )}

            <Button
              variant="primary"
              size="sm"
              disabled={isDownloading || !targetIdOrReference}
              onClick={handleDownload}
              leftIcon={
                isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-white" />
                )
              }
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm"
              title="Download official PDF copy (.pdf)"
            >
              {isDownloading ? 'Downloading...' : 'Download PDF (.pdf)'}
            </Button>
          </div>
        </div>

        {/* PDF Viewer Container */}
        <div
          className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-inner w-full relative"
          style={{ height: '75vh', minHeight: '620px', width: '100%' }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[620px] gap-3 text-slate-600 dark:text-slate-400 p-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Loading Official Tax Invoice & Bill PDF...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Rendering exact layout with GSTIN breakdown, HSN/SAC codes, and authorized verification.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-4 p-8 text-center bg-white dark:bg-slate-900">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Unable to Preview Tax Invoice
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                  }}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Retry Loading
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownload}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Download Directly
                </Button>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={`${pdfUrl}#toolbar=1&view=FitH`}
              title={`Invoice ${invoiceNumber || targetIdOrReference || ''}`}
              className="w-full border-0 bg-white"
              style={{ width: '100%', height: '100%', minHeight: '620px', display: 'block' }}
            />
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
