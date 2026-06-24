import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuthService } from "../core/services/auth-service";
import type { Role } from "../types/roles";

type RouteHandler = React.FC;

type Route = {
  handler: RouteHandler;
  allowedRoles?: Role[];
};

const routes: Record<string, Route> = {};

let root: Root | null = null;

export function registerRoute(
  name: string,
  handler: RouteHandler,
  allowedRoles?: Role[],
) {
  routes[name] = { handler, allowedRoles };
}

export function navigateTo(path: string) {
  window.location.hash = `#/${path}`;
}

function getCurrentRouteName() {
  return window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'login';
}

function renderRoute(name: string) {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  if (!root) {
    root = createRoot(app);
  }

  let route = routes[name];

  if (!route) {
    const routeKeys = Object.keys(routes);
    for (const key of routeKeys) {
      if (key.includes('/:id')) {
        const baseKey = key.split('/:id')[0];
        if (name.startsWith(baseKey + '/')) {
          route = routes[key];
          break;
        }
      }
    }
  }

  if (!route) {
    root.render(<div className="p-6">404 - Not Found</div>);
    return;
  }

  if (route.allowedRoles?.length) {
    const auth = new AuthService();

    if (!auth.isAuthenticated()) {
      navigateTo('login');
      return;
    }

    const role = auth.getRole();

    if (!role || !route.allowedRoles.includes(role)) {
      root.render(<div className="p-6">403 - Forbidden</div>);
      return;
    }
  }

  const Component = route.handler;
  root.render(<Component />);
}

export function initRouter() {
  window.addEventListener("hashchange", () => {
    renderRoute(getCurrentRouteName());
  });

  renderRoute(getCurrentRouteName());
}
