export default function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Petite silhouette bleue derrière le meeple */}
      <path
        d="M6,9.5C7.7,9.5 9,10.9 9,12.6C9,13.6 8.5,14.5 7.8,15.1C8.6,15.7 9.1,16.7 9.1,17.8L9.1,27C9.1,27.7 8.5,28.3 7.8,28.3L4.6,28.3C3.9,28.3 3.3,27.7 3.3,27L3.3,17.8C3.3,16.7 3.8,15.7 4.6,15.1C3.9,14.5 3.4,13.6 3.4,12.6C3.4,10.9 4.6,9.5 6,9.5Z"
        fill="var(--color-brand-blue)"
      />

      {/* Dé isométrique */}
      <path
        d="M25,8.3L30.3,11.2L30.3,17.9L25,20.7L19.7,17.9L19.7,11.2Z"
        fill="#fff"
        stroke="#000"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M25,8.3L30.3,11.2L25,14.1L19.7,11.2Z"
        fill="var(--color-brand-blue)"
        stroke="#000"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M25,14.1L25,20.7"
        fill="none"
        stroke="#000"
        strokeWidth="1.1"
      />

      {/* Meeple jaune */}
      <path
        d="M17,5C13,5 10,7.4 9,10.7C8.3,13 9,14.7 10.4,15.7C9.6,16.6 9.1,18.1 9.4,19.6L9.4,26.5C9.4,28.3 10.8,29.5 12.5,29.5L14.6,29.5C15.4,29.5 16,28.9 16,28.1L16,22.6L18,22.6L18,28.1C18,28.9 18.6,29.5 19.4,29.5L21.5,29.5C23.2,29.5 24.6,28.3 24.6,26.5L24.6,19.6C24.9,18.1 24.4,16.6 23.6,15.7C25,14.7 25.7,13 25,10.7C24,7.4 21,5 17,5Z"
        fill="var(--color-brand-yellow)"
        stroke="#000"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      {/* Accents géométriques */}
      <path d="M6.3,1.5L6.3,5.3M4.4,3.4L8.2,3.4" stroke="#000" strokeWidth="1.2" strokeLinecap="round" />
      <rect
        x="12"
        y="1.2"
        width="3"
        height="3"
        fill="none"
        stroke="#000"
        strokeWidth="1.1"
        transform="rotate(18 13.5 2.7)"
      />
      <circle cx="20.5" cy="3.2" r="1.7" fill="none" stroke="#000" strokeWidth="1.1" />
    </svg>
  );
}
