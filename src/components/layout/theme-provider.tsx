"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * The theme script only needs to run from the server HTML, before first paint.
 * On the client it is marked non-executable so React 19 does not warn about
 * rendering a script tag; next-themes already suppresses the hydration mismatch.
 */
const scriptProps = { type: typeof window === "undefined" ? "text/javascript" : "text/plain" };

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider scriptProps={scriptProps} {...props}>
      {children}
    </NextThemesProvider>
  );
}
