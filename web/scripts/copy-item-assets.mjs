import { cp, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const source = path.join(process.cwd(), "..", "assets", "items");
const runtimeTarget = path.join(process.cwd(), "assets", "items");
const publicTarget = path.join(process.cwd(), "public", "item-assets");

if (existsSync(source)) {
  await mkdir(path.dirname(runtimeTarget), { recursive: true });
  await mkdir(path.dirname(publicTarget), { recursive: true });
  await cp(source, runtimeTarget, { recursive: true });
  await cp(source, publicTarget, { recursive: true });
  console.log("Copied item assets into web/assets/items and web/public/item-assets.");
} else {
  console.log("No ../assets/items directory found. Skipping item asset copy.");
}
