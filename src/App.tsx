import { useEffect } from "react";
import { initRouter } from "./router/Router";
import './router/app-routes';

export default function App() {
  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = "#/login";
    }

    initRouter();
  }, []);

  return <div id="app" />;
}
