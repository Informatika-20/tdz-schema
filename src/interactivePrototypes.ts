// The one list of valid `interactive_tasks.prototype` values: key + Slovak
// label, in display order. tdz derives `PrototypeKey` / `PROTOTYPE_LABELS`
// from it; tabula20 offers these keys when a task is created.
//
// A new prototype needs its component and grading in tdz FIRST — adding a key
// here alone gives a task that tdz cannot render or grade.
//
// No imports on purpose: client code can load it by path without drizzle.
export const INTERACTIVE_PROTOTYPES = [
  { key: "sortFiles", label: "Uprac súbory" },
  { key: "saveAs", label: "Ulož súbor" },
  { key: "buildTree", label: "Postav priečinky" },
  { key: "matchApp", label: "Čím to otvoríš?" },
  { key: "fileTask", label: "Súborová úloha (PDF)" },
  { key: "algoSequence", label: "Naprogramuj cestu" },
  { key: "algoDebug", label: "Oprav chybu" },
  { key: "algoLoops", label: "Skráť to cyklom" },
  { key: "algoPath1", label: "Naprogramuj cestu I" },
  { key: "algoPath2", label: "Naprogramuj cestu II" },
  { key: "algoPath3", label: "Naprogramuj cestu III – rieka" },
  { key: "formatText", label: "Naformátuj text" },
] as const satisfies readonly { key: string; label: string }[];

export type InteractivePrototypeKey =
  (typeof INTERACTIVE_PROTOTYPES)[number]["key"];

export function isInteractivePrototypeKey(
  v: string,
): v is InteractivePrototypeKey {
  return INTERACTIVE_PROTOTYPES.some((p) => p.key === v);
}
