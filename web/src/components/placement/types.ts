export type ChoiceKey = "A" | "B" | "C" | "D" | "E";
export const CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D", "E"];

export interface PlacementProblem {
  n: number;
  statement: string;
  kind: "choice" | "boxes";
  choices?: Partial<Record<ChoiceKey, string>>;
  boxes?: { key: string; digits: number }[];
  points: number;
  /** зөвхөн «Удирдлага»-д ирнэ */
  answer?: ChoiceKey | Record<string, string>;
}

export interface PlacementTestPublic {
  key: string;
  title: string;
  minutes: number;
  instructions: string;
  problems: PlacementProblem[];
}

export type Answers = Record<string, string | Record<string, string>>;
export type Photos = Record<string, string[]>;

export const STATUS_LABEL = { NEW: "Шинэ", REVIEWED: "Шалгасан", CONTACTED: "Холбогдсон" } as const;
export type PlacementStatus = keyof typeof STATUS_LABEL;

export function isAnswered(p: PlacementProblem, a: Answers) {
  const v = a[String(p.n)];
  if (p.kind === "choice") return typeof v === "string" && !!v;
  return !!v && typeof v === "object" && (p.boxes ?? []).every((b) => !!(v as Record<string, string>)[b.key]);
}

/** Утсаар авсан зургийг (3–8MB) илгээхээс өмнө 1600px JPEG болгож багасгана — удаан сүлжээнд */
export async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // HEIC г.м. хөтөч задалж чадахгүй бол эхээр нь (сервер шалгана)
  }
}
