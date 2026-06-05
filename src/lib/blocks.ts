// Widget/block model for the drag-and-drop site builder.

export type BlockType = "hero" | "heading" | "text" | "button" | "image" | "video" | "form" | "columns" | "divider" | "spacer";

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
  { type: "video", label: "Video", icon: "▶" },
  { type: "columns", label: "Columns", icon: "▥" },
  { type: "form", label: "Lead form", icon: "✉" },
  { type: "divider", label: "Divider", icon: "—" },
  { type: "spacer", label: "Spacer", icon: "⊞" },
];

// Leaf widgets that can go inside a column.
export const COLUMN_WIDGETS: { type: BlockType; label: string }[] = [
  { type: "heading", label: "Heading" },
  { type: "text", label: "Text" },
  { type: "button", label: "Button" },
  { type: "image", label: "Image" },
  { type: "video", label: "Video" },
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
    case "form":
      return {
        heading: "Get in touch",
        subtext: "Leave your details and we'll reach out shortly.",
        buttonLabel: "Submit",
        successMessage: "Thanks! We'll be in touch shortly.",
      };
    case "image":
      return { src: "https://placehold.co/800x400/0c0d11/cda14a?text=Image", alt: "Image", align: "center" };
    case "video":
      return { url: "" };
    case "columns":
      return { count: 2, columns: [[], []] };
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

// Convert a YouTube/Vimeo/other URL into an embeddable iframe src.
export function embedUrl(url?: string): string {
  if (!url) return "";
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
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
