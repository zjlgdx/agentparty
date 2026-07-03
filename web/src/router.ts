// 极简 history 路由：/ 与 /c/:slug 两条，导航时保留 ?t=（分享链接直达频道）
import { useCallback, useEffect, useState } from "react";

export function useRoute(): [string, (to: string) => void] {
  const [path, setPath] = useState(() => location.pathname);

  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === location.pathname) return;
    history.pushState(null, "", to + location.search);
    setPath(to);
  }, []);

  return [path, navigate];
}

export function matchChannel(path: string): string | null {
  const m = path.match(/^\/c\/([a-z0-9][a-z0-9-]*)\/?$/);
  return m?.[1] ?? null;
}
