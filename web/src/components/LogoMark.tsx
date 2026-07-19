import Image from "next/image";

interface LogoMarkProps {
  size?: number;
  variant?: "mark" | "full";
  className?: string;
  priority?: boolean;
}

const FULL_RATIO = 1686 / 746;

export default function LogoMark({
  size = 40,
  variant = "mark",
  className = "",
  priority = false,
}: LogoMarkProps) {
  const isFull = variant === "full";
  const width = isFull ? Math.round(size * FULL_RATIO) : size;
  return (
    <Image
      src={isFull ? "/logo-full.png" : "/logo-mark.png"}
      alt="Шинэ ирээдүйн эзэд"
      width={width}
      height={size}
      priority={priority}
      className={`object-contain ${className}`}
      style={{ width, height: size }}
    />
  );
}
