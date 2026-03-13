import { useBatchStore } from "../../stores/useBatchStore";
import { BatchDropZone } from "./BatchDropZone";
import { BatchPipelineBuilder } from "./BatchPipelineBuilder";
import { BatchProgress } from "./BatchProgress";

export function BatchShell(): React.ReactElement {
  const step = useBatchStore((s) => s.step);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-void">
      <div className="bg-grid absolute inset-0 opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-void via-transparent to-void" />
      <div className="noise absolute inset-0" />

      {step === "files" && <BatchDropZone />}
      {step === "operation" && <BatchPipelineBuilder />}
      {(step === "processing" || step === "done") && <BatchProgress />}
    </div>
  );
}
