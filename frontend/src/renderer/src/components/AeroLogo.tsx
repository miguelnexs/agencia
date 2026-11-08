import React from 'react';
import { motion } from 'framer-motion';

interface AeroLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 'w-5 h-5',
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

/**
 * Custom-designed Aviation & Hospitality Emblem ("SkyCrest")
 * Created specifically for AeroAgencia.
 */
export const AeroLogo: React.FC<AeroLogoProps> = ({
  size = 'md',
  animated = true,
  className = '',
}) => {
  return (
    <motion.div
      whileHover={animated ? { scale: 1.07, rotate: -3 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeMap[size]} ${className}`}
    >
      {/* Subtle outer aura glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-teal-500/35 via-emerald-400/25 to-sky-500/35 blur-md pointer-events-none" />

      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="crestBgGrad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#07192e" />
            <stop offset="55%" stopColor="#0c2b45" />
            <stop offset="100%" stopColor="#0a3d4a" />
          </linearGradient>
          <linearGradient id="crestRimGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="jetBodyGrad" x1="25" y1="95" x2="98" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#ecfeff" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
          <linearGradient id="contrailGrad" x1="18" y1="98" x2="78" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
            <stop offset="60%" stopColor="#2dd4bf" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Outer Aerodynamic Hex-Shield Base */}
        <path
          d="M60 6 L104 26 C108 28 111 32 111 37 V74 C111 92 89 107 60 114 C31 107 9 92 9 74 V37 C9 32 12 28 16 26 L60 6 Z"
          fill="url(#crestBgGrad)"
          stroke="url(#crestRimGrad)"
          strokeWidth="4"
        />

        {/* Inner Shield Accent Line */}
        <path
          d="M60 13 L97 30 V72 C97 86 79 99 60 105 C41 99 23 86 23 72 V30 L60 13 Z"
          stroke="#38bdf8"
          strokeOpacity="0.24"
          strokeWidth="1.5"
        />

        {/* Globe Orbital Ring & Meridians */}
        <ellipse
          cx="60"
          cy="63"
          rx="31"
          ry="14"
          transform="rotate(-24 60 63)"
          stroke="#2dd4bf"
          strokeOpacity="0.38"
          strokeWidth="1.8"
          strokeDasharray="4 4"
        />
        <circle
          cx="60"
          cy="62"
          r="24"
          stroke="#38bdf8"
          strokeOpacity="0.22"
          strokeWidth="1.4"
        />

        {/* 3 Hospitality Stars at the Crown */}
        <circle cx="48" cy="24" r="2.2" fill="#38bdf8" />
        <circle cx="60" cy="20" r="3" fill="#2dd4bf" />
        <circle cx="72" cy="24" r="2.2" fill="#38bdf8" />

        {/* Dynamic Ascending Contrail Arc */}
        <path
          d="M24 90 Q 45 78 66 54"
          stroke="url(#contrailGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M32 95 Q 52 84 72 60"
          stroke="url(#contrailGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Stylized Supersonic Swept-Wing Jet */}
        <g transform="translate(62, 54) rotate(-42) translate(-24, -24)">
          <path
            d="M44 24 C47.5 24 50 24.8 51.5 25.5 C50 26.2 47.5 27 44 27 L30 27 L19 43 L14.5 43 L21 27 L9.5 27 L4.5 33.5 L2 33.5 L5.5 25.5 L2 17.5 L4.5 17.5 L9.5 24 L21 24 L14.5 8 L19 8 L30 24 Z"
            fill="url(#jetBodyGrad)"
          />
        </g>
      </svg>
    </motion.div>
  );
};

/**
 * High-resolution SVG Data URI with Emblem + Wordmark for PDF Vouchers & Receipts
 */
export const AERO_LOGO_PDF_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="380" height="96" viewBox="0 0 380 96" fill="none">
  <defs>
    <linearGradient id="bg" x1="6" y1="6" x2="86" y2="86" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#07192e"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <g transform="translate(4, 4) scale(0.73)">
    <path d="M60 6 L104 26 C108 28 111 32 111 37 V74 C111 92 89 107 60 114 C31 107 9 92 9 74 V37 C9 32 12 28 16 26 L60 6 Z" fill="url(#bg)" stroke="url(#rim)" stroke-width="4"/>
    <ellipse cx="60" cy="63" rx="31" ry="14" transform="rotate(-24 60 63)" stroke="#5eead4" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="4 4"/>
    <circle cx="48" cy="24" r="2.4" fill="#38bdf8"/>
    <circle cx="60" cy="20" r="3.2" fill="#2dd4bf"/>
    <circle cx="72" cy="24" r="2.4" fill="#38bdf8"/>
    <path d="M24 90 Q 45 78 66 54" stroke="#2dd4bf" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    <g transform="translate(62, 54) rotate(-42) translate(-24, -24)">
      <path d="M44 24 C47.5 24 50 24.8 51.5 25.5 C50 26.2 47.5 27 44 27 L30 27 L19 43 L14.5 43 L21 27 L9.5 27 L4.5 33.5 L2 33.5 L5.5 25.5 L2 17.5 L4.5 17.5 L9.5 24 L21 24 L14.5 8 L19 8 L30 24 Z" fill="#ffffff"/>
    </g>
  </g>
  <text x="104" y="46" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900" fill="#0f172a" letter-spacing="0.5">AERO<tspan fill="#0d9488">AGENCIA</tspan></text>
  <text x="105" y="68" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#0284c7" letter-spacing="2.2">FLIGHT &amp; HOTEL OPERATIONS</text>
</svg>
`);

export default AeroLogo;

