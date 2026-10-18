import { useId } from "react";

/**
 * Authentic store/OS brand marks, extracted from the project's own store badge
 * artwork (`apps/store-badges.tsx`) and cropped to the mark. Used anywhere a
 * generic outline glyph fails to read at small sizes — the app card platform
 * chips and the admin store-link cards.
 */

type MarkProps = { className?: string };

/** Official 4-color Play triangle. */
export function GooglePlayMark({ className }: MarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const p0 = `${uid}-p0`;
  const p1 = `${uid}-p1`;
  const p2 = `${uid}-p2`;
  const p3 = `${uid}-p3`;
  return (
    <svg viewBox="10 7 33 36" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={p0} x1="26.3214" y1="10.6698" x2="5.76807" y2="30.928" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00A0FF" />
          <stop offset="0.26" stopColor="#00BEFF" />
          <stop offset="0.51" stopColor="#00D2FF" />
          <stop offset="0.76" stopColor="#00DFFF" />
          <stop offset="1" stopColor="#00E3FF" />
        </linearGradient>
        <linearGradient id={p1} x1="40.8465" y1="24.5" x2="11.6393" y2="24.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE000" />
          <stop offset="0.41" stopColor="#FFBD00" />
          <stop offset="0.78" stopColor="#FFA500" />
          <stop offset="1" stopColor="#FF9C00" />
        </linearGradient>
        <linearGradient id={p2} x1="29.9798" y1="27.3175" x2="2.10191" y2="54.783" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3A44" />
          <stop offset="1" stopColor="#C31162" />
        </linearGradient>
        <linearGradient id={p3} x1="8.81397" y1="0.220427" x2="21.2587" y2="12.4864" gradientUnits="userSpaceOnUse">
          <stop stopColor="#32A071" />
          <stop offset="0.48" stopColor="#15CF74" />
          <stop offset="0.8" stopColor="#06E775" />
          <stop offset="1" stopColor="#00F076" />
        </linearGradient>
      </defs>
      <path d="M12.6053 9.23657C12.2074 9.71385 12.0044 10.3274 12.0378 10.9516V38.0486C11.9967 38.6738 12.2007 39.2902 12.6053 39.7636L12.6898 39.8616L27.6496 24.6838V24.3163L12.6898 9.15082L12.6053 9.23657Z" fill={`url(#${p0})`} />
      <path d="M32.5999 29.743L27.6495 24.6838V24.3163L32.5999 19.257L32.7086 19.3305L38.6369 22.736C40.3273 23.7038 40.3273 25.2963 38.6369 26.2763L32.7327 29.6818L32.5999 29.743Z" fill={`url(#${p1})`} />
      <path d="M32.7448 29.6695L27.6495 24.5L12.6052 39.7635C12.9464 40.0716 13.3831 40.2489 13.8396 40.2645C14.2961 40.2802 14.7436 40.1333 15.1046 39.8492L32.7448 29.6695" fill={`url(#${p2})`} />
      <path d="M32.7448 19.3304L15.1046 9.16292C14.746 8.87494 14.2988 8.72445 13.8417 8.73789C13.3846 8.75133 12.9468 8.92786 12.6052 9.23643L27.6495 24.4999L32.7448 19.3304Z" fill={`url(#${p3})`} />
    </svg>
  );
}

/** Authentic Apple logo, cropped to the mark. */
export function AppleMark({ className }: MarkProps) {
  return (
    <svg viewBox="10 9 25 29" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M30.707 24.3645C30.7207 23.3012 31.0039 22.2587 31.5303 21.3339C32.0566 20.4092 32.809 19.6322 33.7174 19.0753C33.1403 18.2534 32.379 17.5771 31.494 17.1C30.6089 16.6228 29.6245 16.3581 28.6189 16.3267C26.4737 16.1021 24.3941 17.6067 23.301 17.6067C22.1867 17.6067 20.5037 16.349 18.6913 16.3862C17.519 16.4239 16.3765 16.7639 15.3752 17.3728C14.3738 17.9818 13.5477 18.8391 12.9774 19.8611C10.5068 24.1266 12.3496 30.3954 14.7162 33.8433C15.9003 35.5316 17.2841 37.4175 19.0949 37.3506C20.8668 37.2773 21.5285 36.2239 23.6673 36.2239C25.7863 36.2239 26.4072 37.3506 28.2547 37.3081C30.156 37.2773 31.3539 35.6123 32.4965 33.908C33.3472 32.705 34.0019 31.3754 34.4362 29.9685C33.3316 29.5026 32.3889 28.7228 31.7257 27.7262C31.0626 26.7297 30.7083 25.5605 30.707 24.3645Z" />
      <path d="M27.2174 14.059C28.2541 12.818 28.7648 11.2229 28.6411 9.61243C27.0573 9.77831 25.5943 10.5332 24.5436 11.7266C24.0299 12.3096 23.6364 12.9878 23.3857 13.7226C23.135 14.4573 23.032 15.2341 23.0826 16.0085C23.8748 16.0167 24.6585 15.8454 25.3747 15.5078C26.0909 15.1701 26.7209 14.6747 27.2174 14.059Z" />
    </svg>
  );
}

/** Vibrant blue-gradient globe for the web platform. */
export function WebMark({ className }: MarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = `${uid}-wg`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={g} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DD3FC" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill={`url(#${g})`} />
      <ellipse cx="12" cy="12" rx="4.2" ry="9" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.95" />
      <line x1="3.4" y1="12" x2="20.6" y2="12" stroke="#fff" strokeWidth="1.6" opacity="0.95" />
    </svg>
  );
}

/** Huawei/AppGallery red-square wordmark, cropped to the mark. */
export function HuaweiMark({ className }: MarkProps) {
  return (
    <svg viewBox="8 6 36 36" aria-hidden="true" className={className}>
      <path
        d="M32.9193 8.98901H19.393C13.0047 8.98901 10.6906 11.3426 10.6906 17.7168V31.2825C10.6906 37.6895 13.0373 40.0104 19.393 40.0104H32.9193C39.3076 40.0104 41.6218 37.6568 41.6218 31.2825V17.7168C41.6544 11.3426 39.3076 8.98901 32.9193 8.98901Z"
        fill="#C8102E"
      />
      <path
        d="M16.8183 24.5167H17.6331V28.5701H16.8183V26.9357H14.9605V28.5701H14.1456V24.5167H14.9605V26.1511H16.8183V24.5167ZM21.4466 26.8376C21.4466 27.4914 21.1206 27.8509 20.534 27.8509C19.9473 27.8509 19.6213 27.4914 19.6213 26.8049V24.5167H18.8065V26.8376C18.8065 27.9817 19.4258 28.6355 20.534 28.6355C21.6421 28.6355 22.294 27.9817 22.294 26.8049V24.5167H21.4792V26.8376H21.4466ZM30.9313 27.2952L30.0187 24.5167H29.3342L28.4216 27.2952L27.5415 24.5167H26.6615L28.063 28.5701H28.7475L29.6601 25.8896L30.5727 28.5701H31.2572L32.6587 24.5167H31.8113L30.9313 27.2952ZM34.158 26.8376H35.6573V26.0858H34.158V25.2686H36.3418V24.5167H33.3758V28.5701H36.4396V27.8183H34.1906V26.8376H34.158ZM37.3848 28.5701H38.1996V24.5167H37.3848V28.5701ZM23.8911 27.7202L23.5325 28.5701H22.6851L24.4452 24.5167H25.1622L26.9223 28.5701H26.0748L25.7489 27.7202H23.8911ZM24.1844 27.001H25.423L24.8037 25.5628L24.1844 27.001Z"
        fill="white"
      />
      <path
        d="M26.1726 19.3514C23.337 19.3514 21.0228 17.0305 21.0228 14.1866H21.7399C21.7399 16.6383 23.7281 18.6323 26.1726 18.6323C28.6171 18.6323 30.6053 16.6383 30.6053 14.1866H31.3224C31.3224 17.0305 29.0082 19.3514 26.1726 19.3514Z"
        fill="white"
      />
    </svg>
  );
}
