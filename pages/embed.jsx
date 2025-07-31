import React from "react";
import dynamic from "next/dynamic";

// ✅ Import your main app dynamically (avoids SSR issues)
const App = dynamic(() => import("./index"), { ssr: false });

export default function Embed() {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <App />
    </div>
  );
}
