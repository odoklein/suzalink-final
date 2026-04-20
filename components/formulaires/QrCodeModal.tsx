"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Loader2, QrCode, X } from "lucide-react";

interface Props {
  formulaireId: string;
  title: string;
  onClose: () => void;
}

export function QrCodeModal({ formulaireId, title, onClose }: Props) {
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/formulaires/${formulaireId}/sign-token`)
      .then((r) => r.json())
      .then(async (json) => {
        if (!json.success) throw new Error(json.error || "Erreur");
        const url: string = json.data.signUrl;
        setSignUrl(url);
        const dataUrl = await QRCode.toDataURL(url, {
          width: 280,
          margin: 2,
          color: { dark: "#1e293b", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [formulaireId]);

  const copy = async () => {
    if (!signUrl) return;
    await navigator.clipboard.writeText(signUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">QR Code de signature</h2>
        </div>

        <p className="text-xs text-slate-500 text-center">
          <span className="font-medium text-slate-700">{title}</span>
          <br />
          Présentez ce QR code à votre prospect — il peut le scanner avec son téléphone pour signer.
        </p>

        {loading && (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 w-full text-center">
            {error}
          </p>
        )}
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR code de signature"
            className="rounded-xl border border-slate-200 shadow-sm"
            width={280}
            height={280}
          />
        )}

        {signUrl && (
          <div className="w-full">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={signUrl}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-600 truncate"
              />
              <button
                type="button"
                onClick={copy}
                className="shrink-0 p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
