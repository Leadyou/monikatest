import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AppDataProvider } from "./lib/store.jsx";
import AuthGate from "./components/AuthGate.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </AuthGate>
  </React.StrictMode>
);
