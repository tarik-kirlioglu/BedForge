import { Toaster } from "sonner";

import { AppShell } from "./components/layout/AppShell";

export function App(): React.ReactElement {
  return (
    <>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          className: "!bg-zinc-800 !border-zinc-700 !text-zinc-100",
        }}
      />
      <AppShell />
    </>
  );
}
