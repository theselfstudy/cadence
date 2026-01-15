import { Suspense } from "react";
import HistoryClient from "./HistoryClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading history…</div>}>
      <HistoryClient />
    </Suspense>
  );
}