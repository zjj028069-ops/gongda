import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrImage({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    void QRCode.toDataURL(text, { width: 220, margin: 1 }).then((url) => { if (alive) setSrc(url); });
    return () => { alive = false; };
  }, [text]);
  return src ? <img src={src} alt="二维码" width={220} height={220} /> : <span>正在生成二维码…</span>;
}
