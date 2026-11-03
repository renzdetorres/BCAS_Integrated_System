import { lazy } from "react";

const RELOAD_KEY = "bcas.chunk-reload";

function flag(action, value) {
  try {
    if (action === "get") return sessionStorage.getItem(RELOAD_KEY);
    if (action === "set") sessionStorage.setItem(RELOAD_KEY, value);
    if (action === "clear") sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Storage blocked: behave as if the flag were never set.
  }
  return null;
}

// The top progress line listens for these, so a page's file being fetched is shown while it loads.
export const PAGE_LOADING_EVENT = "bcas:page-loading";
export const PAGE_LOADED_EVENT = "bcas:page-loaded";

function announce(type) {
  window.dispatchEvent(new Event(type));
}

/**
 * React.lazy for a route's page. A tab left open across a deploy asks for page
 * files whose names have changed, and the import fails; reload once to pick up
 * the new build (the flag stops a reload loop if the server is simply down).
 */
export function lazyPage(loader) {
  return lazy(async () => {
    announce(PAGE_LOADING_EVENT);
    try {
      const page = await loader();
      flag("clear");
      announce(PAGE_LOADED_EVENT);
      return page;
    } catch (error) {
      announce(PAGE_LOADED_EVENT);
      if (flag("get") !== "1") {
        flag("set", "1");
        window.location.reload();
        // Never resolves: the page is reloading, so nothing should render in between.
        return new Promise(() => {});
      }
      throw error;
    }
  });
}
