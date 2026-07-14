import { cp, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const source = path.join(process.cwd(), "..", "assets", "items");
const target = path.join(process.cwd(), "assets", "items");

if (existsSync(source)) {
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
  console.log("Copied item assets into web/assets/items.");
} else {
  console.log("No ../assets/items directory found. Skipping item asset copy.");
}
