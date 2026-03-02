import { Toaster } from "sonner";

import { AppShell } from "./components/layout/AppShell";

export function App(): React.ReactElement {
  return (
    <>
      <Toaster
        position="bottom-right"
        theme="dark"
        gap={8}
        toastOptions={{
          className:
            "!bg-surface !border !border-elevated/50 !text-text-primary !shadow-2xl !shadow-black/40 !rounded-xl !font-[Sora]",
          descriptionClassName: "!text-text-muted !font-mono !text-[11px]",
        }}
      />
      <AppShell />
    </>
  );
}
