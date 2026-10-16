import React from 'react';

/**
 * Resolves the icon key from user selection or defaults based on facility type.
 */
export function getFacilityIconKey(iconName?: string, facilityType?: string): string {
  if (iconName && iconName !== 'default') return iconName;
  switch (facilityType) {
    case 'entrance':
      return 'log-in';
    case 'exit':
      return 'log-out';
    case 'registration':
      return 'badge';
    case 'restroom':
      return 'restroom';
    case 'dining':
    case 'food-court':
      return 'utensils';
    case 'stage':
      return 'presentation';
    case 'shutter':
    case 'custom-zone':
    case 'corridor':
    default:
      return 'door';
  }
}

/**
 * Clean standalone SVG icon renderer with dynamic proportional scaling.
 */
export function renderFacilitySvgIcon(
  iconKey: string,
  cx: number,
  cy: number,
  size: number = 24,
  color: string = '#334155'
): React.ReactNode {
  const s = Math.max(12, Math.min(64, size || 24));
  const half = s / 2;
  const scale = s / 24;

  let content: React.ReactNode = null;

  switch (iconKey) {
    case 'log-in':
      content = (
        <>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </>
      );
      break;
    case 'log-out':
      content = (
        <>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </>
      );
      break;
    case 'utensils':
      content = (
        <>
          <path d="M18 2v6h3V2z" />
          <path d="M18 8a3 3 0 0 0 3 3v11" />
          <path d="M5 2v7a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2" />
          <path d="M8 12v10" />
        </>
      );
      break;
    case 'coffee':
      content = (
        <>
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </>
      );
      break;
    case 'restroom':
      content = (
        <>
          <circle cx="9" cy="5" r="2" />
          <path d="M7 10h4l1 6H6z" />
          <path d="M8 16v5" />
          <path d="M10 16v5" />
          <circle cx="17" cy="5" r="2" />
          <path d="M15 10l1 5h2l1-5z" />
        </>
      );
      break;
    case 'presentation':
      content = (
        <>
          <path d="M2 3h20" />
          <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
          <path d="m7 21 5-5 5 5" />
        </>
      );
      break;
    case 'badge':
      content = (
        <>
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      );
      break;
    case 'shield':
      content = <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />;
      break;
    case 'info':
      content = (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </>
      );
      break;
    case 'zap':
      content = <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />;
      break;
    case 'star':
      content = (
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      );
      break;
    case 'door':
    default:
      content = (
        <>
          <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
          <path d="M2 20h20" />
          <circle cx="14" cy="12" r="1" fill={color} />
        </>
      );
      break;
  }

  return (
    <g
      transform={`translate(${cx - half}, ${cy - half}) scale(${scale})`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none select-none"
    >
      {content}
    </g>
  );
}
