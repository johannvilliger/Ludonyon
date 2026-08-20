export default function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="6.3" cy="9.5" r="2.7" fill="var(--color-brand-blue)" />
      <path
        d="M9.5,3.2C9.5,1.9 10.6,1 12,1C13.4,1 14.5,1.9 14.5,3.2C14.5,4 14.1,4.7 13.5,5.1L17.8,10.3C18.3,10.9 17.9,11.8 17.1,11.8L15.2,11.8L15.2,20.3C15.2,21.2 14.5,21.9 13.6,21.9L12.6,21.9L12.6,16.3L11.4,16.3L11.4,21.9L10.4,21.9C9.5,21.9 8.8,21.2 8.8,20.3L8.8,11.8L6.9,11.8C6.1,11.8 5.7,10.9 6.2,10.3L10.5,5.1C9.9,4.7 9.5,4 9.5,3.2Z"
        fill="var(--color-brand-yellow)"
        stroke="#000"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
