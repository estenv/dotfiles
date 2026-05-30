import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerContextCommand } from "./context-command";

export default function (pi: ExtensionAPI): void {
  registerContextCommand(pi);
}
