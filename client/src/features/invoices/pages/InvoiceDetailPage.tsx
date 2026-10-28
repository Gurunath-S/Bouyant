import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../../services/api/apiClient';
import { Button } from '../../../components/ui/Button';
import { BackButton } from '../../../components/ui/BackButton';
import { useAuthStore } from '../../../stores/authStore';
import { FileText, RefreshCw } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber?: string;
  issueDate?: string;
  createdAt?: string;
  grandTotal?: number;
}

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Invoice ID is missing.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const fetchInvoiceAndPdf = async () => {
      setLoading(true);
      setError('');

      try {
        // 1. Fetch invoice details using the existing authenticated API client.
        const invoiceResponse: any = await apiClient.get(`/invoices/${id}`);

        const invoiceData =
          invoiceResponse?.data?.data ??
          invoiceResponse?.data?.invoice ??
          invoiceResponse?.data;

        if (!invoiceData || !invoiceData.id) {
          throw new Error('Invoice details were not returned by the server.');
        }

        if (cancelled) return;

        setInvoice(invoiceData);

        // 2. Fetch the PDF using the same API client.
        setPdfLoading(true);

        /*
         * IMPORTANT:
         * This assumes your backend PDF route is:
         * GET /invoices/:id/pdf
         *
         * If your backend uses a different route, change it here.
         */
        const pdfResponse: any = await apiClient.get(
          `/invoices/${id}/pdf`,
          {
            responseType: 'blob',
          }
        );

        if (cancelled) return;

        // Handle a PDF Blob or a response containing a Blob.
        const pdfBlob: Blob =
          pdfResponse instanceof Blob
            ? pdfResponse
            : pdfResponse?.data instanceof Blob
              ? pdfResponse.data
              : new Blob([pdfResponse?.data], {
                  type: 'application/pdf',
                });

        if (pdfBlob.size === 0) {
          throw new Error('The server returned an empty PDF.');
        }

        objectUrl = URL.createObjectURL(
          pdfBlob.type === 'application/pdf'
            ? pdfBlob
            : new Blob([pdfBlob], { type: 'application/pdf' })
        );

        setPdfUrl(objectUrl);
      } catch (err: any) {
        console.error('Failed to load invoice:', err);

        if (!cancelled) {
          const status = err?.response?.status;

          if (status === 401) {
            setError('Your session has expired. Please log in again.');
          } else if (status === 403) {
            setError('You are not authorized to view this invoice.');
          } else if (status === 404) {
            setError(
              'Invoice or PDF endpoint not found. Please verify the backend API route.'
            );
          } else {
            setError(
              err?.response?.data?.message ||
                err?.message ||
                'Failed to load the invoice PDF.'
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPdfLoading(false);
        }
      }
    };

    fetchInvoiceAndPdf();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id]);


  const getBackConfig = () => {
    if (
      user?.role === 'SUPERADMIN' ||
      user?.role === 'ADMIN' ||
      user?.role === 'STAFF'
    ) {
      return {
        to: '/workspace/payments?tab=INVOICES',
        label: 'Back to Billing & Invoices',
      };
    }

    return {
      to: '/invoices',
      label: 'Back to My Invoices',
    };
  };

  const backConfig = getBackConfig();

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <FileText className="mx-auto mb-3 h-8 w-8" />
        <p className="font-medium">Loading invoice...</p>
        <p className="mt-1 text-sm">
          Fetching invoice details and PDF.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto my-12 max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-red-600">
          Unable to Load Invoice
        </h2>

        <p className="mt-3 break-words text-sm text-slate-600">
          {error}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <BackButton
            to={backConfig.to}
            label={backConfig.label}
            variant="outline"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center">
        <p>Invoice not found.</p>

        <div className="mt-4">
          <BackButton
            to={backConfig.to}
            label={backConfig.label}
            variant="outline"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Header and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <BackButton
          to={backConfig.to}
          label={backConfig.label}
        />

      </div>

      {/* PDF viewer */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {pdfLoading || !pdfUrl ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-500">
            <FileText className="h-8 w-8" />

            <p className="text-sm">
              Preparing invoice PDF...
            </p>
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            title={`Invoice ${invoice.invoiceNumber || ''}`}
            className="h-[85vh] min-h-[500px] w-full"
          />
        )}
      </div>
    </div>
  );
};
 