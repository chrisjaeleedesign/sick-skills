import { createRoot } from "react-dom/client";
import { Shell } from "./shell";
import { Routes } from "./routes";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <Shell>
    <Routes />
  </Shell>,
);
