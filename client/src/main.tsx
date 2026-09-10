import { createRoot } from "react-dom/client";
import App from "./App";
import { markWebDocument } from "@/lib/webMeta";
import "./index.css";

// Browser builds only: `data-web` on <html> gates the mouse hover layer in index.css.
// Never set inside the iOS app (see markWebDocument).
markWebDocument();

// Figma "HTML to Design" capture helper for design sessions. Dev server only:
// production web builds and the iOS app never load it.
if (import.meta.env.DEV) {
  const capture = document.createElement("script");
  capture.src = "https://mcp.figma.com/mcp/html-to-design/capture.js";
  capture.async = true;
  document.body.appendChild(capture);
}

createRoot(document.getElementById("root")!).render(<App />);
