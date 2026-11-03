import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/** 细线放大镜（禁止实心蓝底） */
export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} width="22" height="22" {...props}><circle cx="11" cy="11" r="6.2" /><path d="m16.2 16.2 3.3 3.3" /></svg>;
}

/** 细线圆圈＋（禁止实心蓝圆加号） */
export function IconPlusCircle(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} width="22" height="22" {...props}><circle cx="12" cy="12" r="8.2" /><path d="M12 8.2v7.6M8.2 12h7.6" /></svg>;
}

export function IconTabMessage(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} width="24" height="24" {...props}><path d="M5.2 18.6 4 20.8l3.1-.7A8.8 8.8 0 1 0 5.2 18.6z" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
}

export function IconTabContacts(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} width="24" height="24" {...props}><circle cx="12" cy="8.2" r="3.1" /><path d="M5.2 19.2c.9-3.2 3.2-4.8 6.8-4.8s5.9 1.6 6.8 4.8" /></svg>;
}

export function IconTabFunctions(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width="24" height="24" {...props}>
      <rect x="3.5" y="3.5" width="4.6" height="4.6" rx="0.9" />
      <rect x="9.7" y="3.5" width="4.6" height="4.6" rx="0.9" />
      <rect x="15.9" y="3.5" width="4.6" height="4.6" rx="0.9" />
      <rect x="3.5" y="9.7" width="4.6" height="4.6" rx="0.9" />
      <rect x="9.7" y="9.7" width="4.6" height="4.6" rx="0.9" />
      <rect x="15.9" y="9.7" width="4.6" height="4.6" rx="0.9" />
      <rect x="3.5" y="15.9" width="4.6" height="4.6" rx="0.9" />
      <rect x="9.7" y="15.9" width="4.6" height="4.6" rx="0.9" />
      <rect x="15.9" y="15.9" width="4.6" height="4.6" rx="0.9" />
    </svg>
  );
}

export function IconTabSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width="24" height="24" {...props}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9 5.4 18.6" />
      <path d="M12 6.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6z" />
    </svg>
  );
}

export function IconChevron(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} width="16" height="16" strokeWidth="1.8" {...props}><path d="m6 4 6 6-6 6" /></svg>;
}
