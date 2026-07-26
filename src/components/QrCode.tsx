import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({
  value,
  size = 160,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className="animate-pulse rounded-md bg-muted"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR code linking to the credential verification page"
      className={className}
    />
  );
}
