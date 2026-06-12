import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APIProvider } from "@vis.gl/react-google-maps";
import "./index.css";
import App from "./App.tsx";

const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Wrap in the Google Maps provider only when a key is configured. Without it,
// the app runs fully on mock pharmacy data (no map).
const tree = mapsKey ? (
  <APIProvider apiKey={mapsKey} libraries={["places", "marker"]}>
    <App />
  </APIProvider>
) : (
  <App />
);

createRoot(document.getElementById("root")!).render(<StrictMode>{tree}</StrictMode>);
