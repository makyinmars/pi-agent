import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const execFileAsync = promisify(execFile);

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Gruvbox, matching the Neovim dashboard and the gruvbox-dark-hard theme.
const YELLOW: Rgb = [215, 153, 33];
const BRIGHT_YELLOW: Rgb = [250, 189, 47];
const ORANGE: Rgb = [214, 93, 14];
const BRIGHT_ORANGE: Rgb = [254, 128, 25];
const PALETTE: Rgb[] = [
  YELLOW,
  BRIGHT_YELLOW,
  BRIGHT_ORANGE,
  ORANGE,
  BRIGHT_ORANGE,
  BRIGHT_YELLOW,
];

type Rgb = [number, number, number];

// Same image and chafa size as the Neovim dashboard (~/.config/nvim/lua/plugins/snacks.lua).
const IMAGE_PATH = path.join(getAgentDir(), "assets", "void.png");
const IMAGE_SIZE = "35x17";
const ART_GAP = "     ";

// Same vertical lettering as ~/.config/nvim/assets/void.sh.
const VOID_LINES = [
  "█ █",
  "█ █",
  " ▀ ",
  "",
  "█▀█",
  "█ █",
  "▀▀▀",
  "",
  "▀█▀",
  " █ ",
  "▀█▀",
  "",
  "█▀▄",
  "█ █",
  "▀▀ ",
];
const VOID_WIDTH = 3;

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function sampleGradient(position: number) {
  const wrapped = ((position % 1) + 1) % 1;
  const scaled = wrapped * PALETTE.length;
  const index = Math.floor(scaled);
  const nextIndex = (index + 1) % PALETTE.length;
  const t = scaled - index;
  const a = PALETTE[index]!;
  const b = PALETTE[nextIndex]!;
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)] as Rgb;
}

function fg([r, g, b]: Rgb, text: string) {
  return `\x1b[38;2;${r};${g};${b}m${text}${RESET}`;
}

function gradientText(text: string) {
  const chars = [...text];
  const span = Math.max(chars.length - 1, 1);
  return chars
    .map((char, index) => {
      if (char === " ") return char;
      return fg(sampleGradient(index / span), char);
    })
    .join("");
}

function leftPad(contentWidth: number, width: number) {
  return " ".repeat(Math.max(Math.floor((width - contentWidth) / 2), 0));
}

function projectName() {
  return path.basename(process.cwd()) || "session";
}

async function loadImageLines() {
  try {
    const { stdout } = await execFileAsync(
      "chafa",
      [
        IMAGE_PATH,
        "--format=symbols",
        `--size=${IMAGE_SIZE}`,
        "--colors=full",
        "--polite=on",
      ],
      { timeout: 5_000, maxBuffer: 1024 * 1024 },
    );
    return stdout.trimEnd().split("\n");
  } catch {
    // chafa missing or failed: render the VOID lettering alone.
    return [];
  }
}

function renderArt(width: number, imageLines: string[] | undefined) {
  // Still loading: render nothing so the lettering doesn't jump once the image arrives.
  if (!imageLines) return [];

  const imageWidth = Math.max(0, ...imageLines.map(visibleWidth));
  const artWidth =
    imageWidth > 0 ? imageWidth + ART_GAP.length + VOID_WIDTH : VOID_WIDTH;
  if (artWidth > width) return [];

  const pad = leftPad(artWidth, width);
  const rows = Math.max(imageLines.length, VOID_LINES.length);
  return Array.from({ length: rows }, (_, row) => {
    const letters = fg(YELLOW, VOID_LINES[row] ?? "");
    if (imageWidth === 0) return `${pad}${letters}`;

    const image = imageLines[row] ?? "";
    const imagePad = " ".repeat(imageWidth - visibleWidth(image));
    return `${pad}${image}${RESET}${imagePad}${ART_GAP}${letters}`;
  });
}

function renderHeader(
  width: number,
  imageLines: string[] | undefined,
  subtitleText: string,
) {
  const centered = `${leftPad(visibleWidth(subtitleText), width)}${subtitleText}`;

  return [
    "",
    ...renderArt(width, imageLines),
    "",
    truncateToWidth(`${BOLD}${gradientText(centered)}${RESET}`, width),
    "",
  ];
}

export default function (pi: ExtensionAPI) {
  let requestRender: (() => void) | undefined;
  let currentModelId = "no model selected";
  let imageLines: string[] | undefined;
  let imageLoad: Promise<void> | undefined;

  function installHeader(ctx: ExtensionContext) {
    if (ctx.mode !== "tui") return;

    imageLoad ??= loadImageLines().then((lines) => {
      imageLines = lines;
      requestRender?.();
    });

    ctx.ui.setHeader((tui) => {
      requestRender = () => tui.requestRender();
      return {
        render(width: number) {
          return renderHeader(
            width,
            imageLines,
            `${currentModelId} · ${projectName()}`,
          );
        },
        invalidate() {
          tui.requestRender();
        },
      };
    });
  }

  pi.on("session_start", (_event, ctx) => {
    currentModelId = ctx.model?.id ?? "no model selected";
    if (ctx.mode !== "tui") return;
    installHeader(ctx);
  });

  pi.on("model_select", (event) => {
    currentModelId = event.model.id;
    requestRender?.();
  });

  pi.on("session_shutdown", (_event, ctx) => {
    requestRender = undefined;
    if (ctx.mode === "tui") ctx.ui.setHeader(undefined);
  });

  pi.registerCommand("flow-title", {
    description: "Enable the VOID session header from the Neovim dashboard",
    handler: async (_args, ctx) => {
      installHeader(ctx);
      ctx.ui.notify("VOID header enabled", "info");
    },
  });

  pi.registerCommand("flow-title-builtin", {
    description: "Restore pi's built-in header for this session",
    handler: async (_args, ctx) => {
      ctx.ui.setHeader(undefined);
      ctx.ui.notify("Built-in header restored", "info");
    },
  });
}
