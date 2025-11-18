import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";
import yellow from "@park-ui/panda-preset/colors/yellow";
import sand from "@park-ui/panda-preset/colors/sand";

export default defineConfig({
  preflight: true,
  presets: [
    createPreset({ accentColor: yellow, grayColor: sand, radius: "xs" }),
  ],
  include: ["./src/**/*.{js,jsx,ts,tsx}"],
  jsxFramework: "solid",
  outdir: "styled-system",
  conditions: {
    extend: {
      dark: '.dark &, [data-theme="dark"] &',
      light: '.light &, [data-theme="light"] &',
    },
  },
});
