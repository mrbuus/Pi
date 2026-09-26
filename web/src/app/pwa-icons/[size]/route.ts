import { renderIcon } from "@/components/pwa/render-icon";
export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return ["192", "512", "maskable"].map((size) => ({ size }));
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (!["192", "512", "maskable"].includes(size))
    return new Response(null, { status: 404 });
  return renderIcon(size === "192" ? 192 : 512, size === "maskable");
}
