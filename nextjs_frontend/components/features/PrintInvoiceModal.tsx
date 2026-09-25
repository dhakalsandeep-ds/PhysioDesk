"use client";

import { useState, useEffect } from "react";
import { X, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getInvoicePdfUrl, downloadInvoicePdf } from "@/hooks/useBilling";

interface PrintInvoiceModalProps {
  invoiceId: number | null;
  invoiceNumber: string;
  onClose: () => void;
}

export function PrintInvoiceModal({ invoiceId, invoiceNumber, onClose }: PrintInvoiceModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const url = await getInvoicePdfUrl(invoiceId);
        
        const cleanUrl = url.includes("?") 
          ? `${url}#toolbar=0&navpanes=0&scrollbar=1` 
          : `${url}#toolbar=0&navpanes=0&scrollbar=1`;
          
        setPdfUrl(cleanUrl);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load PDF preview.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (pdfUrl) {
        const baseUrl = pdfUrl.split('#')[0];
        window.URL.revokeObjectURL(baseUrl);
      }
    };
  }, [invoiceId]);

  if (!invoiceId) return null;

  const handleDownload = async () => {
    if (invoiceId) {
      await downloadInvoicePdf(invoiceId, invoiceNumber);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8">
      
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full px-6 py-2.5 shadow-2xl z-20">
        <div className="flex items-center gap-2 text-white">
          <FileText className="w-4 h-4" />
          <span className="font-medium text-sm tracking-wide">{invoiceNumber}</span>
        </div>
        
        <div className="w-px h-4 bg-white/20" /> 
        <button
          onClick={handleDownload}
          disabled={isLoading || !!error}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 rounded-full transition disabled:opacity-50"
          title="Download PDF"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </button>
        
        <button 
          onClick={onClose} 
          className="p-1.5 text-white hover:bg-white/20 rounded-full transition"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative w-full max-w-5xl h-[85vh] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-white">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading document...</p>
          </div>
        ) : error ? (
          <div className="text-center max-w-md bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-xl">
            <div className="w-12 h-12 bg-red-500/20 text-red-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <X className="w-6 h-6" />
            </div>
            <p className="text-white font-semibold mb-1">Failed to Load Preview</p>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
            <Button variant="primary" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download Directly
            </Button>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full bg-white shadow-2xl rounded-lg border-0"
            title={`Invoice ${invoiceNumber}`}
            style={{ backgroundColor: 'white' }}
          />
        ) : null}
      </div>
    </div>
  );
}

