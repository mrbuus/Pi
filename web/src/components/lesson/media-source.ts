export function youtubeId(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      return null;
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "www.youtube-nocookie.com",
      ].includes(u.hostname)
    ) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (/^\/(embed|shorts)\/[A-Za-z0-9_-]{11}$/.test(u.pathname))
        id = u.pathname.split("/")[2];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function allowedDirect(input: string): boolean {
  try {
    const u = new URL(input);
    const origins = (process.env.NEXT_PUBLIC_TRUSTED_VIDEO_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim());
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hash &&
      origins.includes(u.origin) &&
      /\.(mp4|webm)$/i.test(u.pathname)
    );
  } catch {
    return false;
  }
}
