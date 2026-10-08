import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const ogFonts = {
  normal: readFileSync(resolve("public/fonts/ExpoArabic-Book.woff2")),
  bold: readFileSync(resolve("public/fonts/DG-Ghareeb-REG.ttf"))
  // satori cannot read woff2; DG-Ghareeb TTF ships for OG text rendering,
};
