import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/global.css";
import App from "./App.tsx";
import Home from "./pages/Home.tsx";
import About from "./pages/About.tsx";
import Api from "./pages/Api.tsx";
import Benchmarks from "./pages/Benchmarks.tsx";
import ModelCard from "./pages/ModelCard.tsx";
import { ROUTES } from "./routes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path={ROUTES.home} element={<Home />} />
          <Route path={ROUTES.about} element={<About />} />
          <Route path={ROUTES.api} element={<Api />} />
          <Route path={ROUTES.benchmarks} element={<Benchmarks />} />
          <Route path={ROUTES.modelCard} element={<ModelCard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
