import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

import manifest from "../../../../../extension/manifest.json";
import { ExtensionDevices } from "@/components/extension/extension-devices";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listApiTokens } from "@/lib/auth/api-token";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata = { title: "Browser extension | Portfolio Intelligence" };

/** Built by `npm run ext:build`, which `npm run build` runs before every deploy. */
const DOWNLOAD_PATH = "/downloads/portfolio-intelligence-extension.zip";

export default async function ExtensionSettingsPage() {
  const user = await getCurrentUser();
  const tokens = await listApiTokens(user.id);
  const devices = tokens.map((token) => ({
    id: token.id,
    name: token.name,
    createdAt: token.createdAt.toISOString(),
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    expiresAt: token.expiresAt.toISOString(),
  }));

  return (
    <>
      <Link href="/settings" className="text-muted-foreground hover:text-foreground mb-3 inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Settings
      </Link>
      <PageHeader
        title="Browser extension"
        description="Shows your targets, status and conviction on Tickertape's Portfolio page. The extension can only read."
      />

      <div className="grid max-w-2xl gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Connected devices</CardTitle>
            <CardDescription>
              Each sign-in from the extension lasts 90 days. Sign out a device you no longer use or don&apos;t recognise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExtensionDevices devices={devices} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Install in Chrome</CardTitle>
            <CardDescription>
              Version {manifest.version}. The extension is not in the Chrome Web Store yet, so Chrome installs it from a
              folder. It takes about a minute.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button asChild className="w-fit">
              <a href={DOWNLOAD_PATH} download>
                <Download />
                Download extension
              </a>
            </Button>
            <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm">
              <li>
                Open the downloaded zip. You get a folder named{" "}
                <span className="text-foreground font-medium">portfolio-intelligence-extension</span>. Move it somewhere
                it can stay, such as Documents; Chrome keeps loading it from there.
              </li>
              <li>
                In Chrome, type <code className="text-foreground">chrome://extensions</code> in the address bar and turn on{" "}
                <span className="text-foreground font-medium">Developer mode</span> (top right).
              </li>
              <li>
                Click <span className="text-foreground font-medium">Load unpacked</span> and choose that folder.
              </li>
              <li>
                Click the puzzle icon in Chrome&apos;s toolbar and pin{" "}
                <span className="text-foreground font-medium">Portfolio Intelligence</span>.
              </li>
              <li>Click the pinned icon and sign in with the same email and password you use here.</li>
              <li>
                Open your Portfolio on Tickertape, then US Stocks. Each stock shows your target; click it for details.
              </li>
            </ol>
            <p className="text-muted-foreground text-sm">
              To update, download again, replace the folder, then click the reload arrow on the extension in{" "}
              <code className="text-foreground">chrome://extensions</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
