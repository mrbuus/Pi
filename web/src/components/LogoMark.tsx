// √∞ лого — брэндийн тэмдгийг SVG-ээр (хар дэвсгэр дээр цэвэрхэн харагдана)
export default function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-label="Шинэ ирээдүйн эзэд лого"
    >
      <circle cx="50" cy="50" r="48" fill="#2e4a8f" />
      <path
        d="M14 62 L34 62 L43 78 L57 32 L88 32"
        stroke="white"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="63"
        y="63"
        fontSize="30"
        fontWeight="700"
        fill="white"
        fontFamily="serif"
      >
        ∞
      </text>
    </svg>
  );
}
