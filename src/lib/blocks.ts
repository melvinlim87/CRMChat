// Widget/block model for the drag-and-drop site builder.

export type BlockType = "hero" | "heading" | "text" | "button" | "image" | "divider" | "spacer";

export type Block = {
  id: string;
  type: BlockType;
  data: Record<string, any>;
};

export const WIDGETS: { type: BlockType; label: string; icon: string }[] = [
  { type: "hero", label: "Hero", icon: "★" },
  { type: "heading", label: "Heading", icon: "H" },
  { type: "text", label: "Text", icon: "¶" },
  { type: "button", label: "Button", icon: "▭" },
  { type: "image", label: "Image", icon: "▣" },
  { type: "divider", label: "Divider", icon: "—" },
  { type: "spacer", label: "Spacer", icon: "⊞" },
];

export function defaultData(type: BlockType): Record<string, any> {
  switch (type) {
    case "hero":
      return {
        title: "Empowering the next generation",
        subtitle: "Your headline subtext goes here. Describe what you offer.",
        buttonLabel: "Get started",
        buttonHref: "#",
        align: "center",
      };
    case "heading":
      return { text: "A bold heading", align: "left" };
    case "text":
      return { text: "Write your paragraph here. Click to edit.", align: "left" };
    case "button":
      return { label: "Click me", href: "#", align: "left" };
    case "image":
      return { src: "https://placehold.co/800x400/0c0d11/cda14a?text=Image", alt: "Image", align: "center" };
    case "spacer":
      return { size: 48 };
    case "divider":
    default:
      return {};
  }
}

export function newBlock(type: BlockType): Block {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${type}-${Date.now()}`,
    type,
    data: defaultData(type),
  };
}

export function alignClass(align?: string): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export function flexAlign(align?: string): string {
  if (align === "center") return "justify-center";
  if (align === "right") return "justify-end";
  return "justify-start";
}
