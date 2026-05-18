'use client';

import { useEffect, useState } from 'react';

export function upiQrString(upiId: string, businessName: string, amount: number) {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${amount.toFixed(2)}&cu=INR`;
}

export async function upiQrDataUrl(upiId: string, businessName: string, amount: number, size = 200): Promise<string> {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(upiQrString(upiId, businessName, amount), { width: size, margin: 1 });
}

interface UpiQrProps {
  upiId: string;
  businessName: string;
  amount: number;
  size?: number;
  className?: string;
}

export function UpiQr({ upiId, businessName, amount, size = 160, className }: UpiQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    upiQrDataUrl(upiId, businessName, amount, size)
      .then(url => setDataUrl(url))
      .catch(() => {});
  }, [upiId, businessName, amount, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-gray-100 rounded animate-pulse ${className ?? ''}`}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="UPI QR" width={size} height={size} className={className} />;
}
