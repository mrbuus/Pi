import Image from "next/image";

interface LogoMarkProps {
  size?: number;
  variant?: "mark" | "full";
  className?: string;
  priority?: boolean;
}

const FULL_RATIO = 1686 / 746;

/**
 * Сургалтын төвийн лого. Бүтэн логоны хар хөх бичвэр харанхуй дэвсгэр дээр
 * алга болдог тул харанхуй горимд `logo-full-dark.png`-г (дугуй, доторх цагаан
 * тэмдэг яг хэвээр, зөвхөн дугуйн гаднах бичвэр цагаан) харуулна — сонголтыг
 * globals.css-ийн `.logo-on-light/.logo-on-dark` (data-theme + системийн горим).
 * Дугуй тэмдэг (mark) хоёр горимд ижил харагддаг тул ганц файлтай.
 */
export default function LogoMark({
  size = 40,
  variant = "mark",
  className = "",
  priority = false,
}: LogoMarkProps) {
  const isFull = variant === "full";
  const width = isFull ? Math.round(size * FULL_RATIO) : size;
  const common = {
    alt: "Шинэ ирээдүйн эзэд",
    width,
    height: size,
    priority,
    // height:auto — эх хайрцаг нарийсвал (max-width:100%) харьцаа хадгалагдана
    style: { width, height: "auto" } as const,
  };
  if (!isFull)
    return <Image src="/logo-mark.png" {...common} className={`object-contain ${className}`} />;
  return (
    <>
      <Image src="/logo-full.png" {...common} className={`logo-on-light object-contain ${className}`} />
      <Image src="/logo-full-dark.png" {...common} className={`logo-on-dark object-contain ${className}`} />
    </>
  );
}
