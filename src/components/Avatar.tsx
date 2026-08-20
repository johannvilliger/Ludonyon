import Image from "next/image";
import { photoUrl } from "@/lib/photoStorage";

const COLORS = [
  "bg-brand-blue",
  "bg-brand-yellow-dark",
  "bg-stone-500",
  "bg-brand-blue-dark",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % COLORS.length;
  return COLORS[hash];
}

export default function Avatar({
  name,
  photoPath,
  size = 40,
}: {
  name: string;
  photoPath: string | null;
  size?: number;
}) {
  const url = photoUrl(photoPath);
  const style = { width: size, height: size };

  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        style={style}
        className="shrink-0 rounded-full border border-stone-200 object-cover"
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      style={{ ...style, fontSize: size * 0.4 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorFor(name)}`}
    >
      {initials || "?"}
    </span>
  );
}
