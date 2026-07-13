import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import PrivacyPolicy from "./PrivacyPolicy.jsx";

// Egyszerű útvonal-választás router-könyvtár nélkül: az /adatvedelmi-tajekoztato
// címen az adatvédelmi oldal jelenik meg, minden más úton a fő audit alkalmazás.
const path = window.location.pathname.replace(/\/+$/, "");
const Page = path === "/adatvedelmi-tajekoztato" ? PrivacyPolicy : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
);
