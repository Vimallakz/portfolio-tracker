"use client";

import { FileDown } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Opens the print dialog, where "Save as PDF" produces the file. The page is
 * printed in the light theme even when dark mode is on, including Ctrl/Cmd+P.
 */
export function ExportPdfButton() {
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;

    const toLight = () => {
      wasDark = root.classList.contains("dark");
      root.classList.remove("dark");
    };
    const restore = () => {
      if (wasDark) root.classList.add("dark");
    };

    window.addEventListener("beforeprint", toLight);
    window.addEventListener("afterprint", restore);

    return () => {
      window.removeEventListener("beforeprint", toLight);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  return (
    <Button size="sm" onClick={() => window.print()} className="print:hidden">
      <FileDown />
      Export PDF
    </Button>
  );
}
