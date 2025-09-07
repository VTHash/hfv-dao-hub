import { useEffect } from "react";
import Vortex from "../components/Vortex.jsx";

export default function useRevealVortex(selector = ".card") {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll(selector));
    const vortices = new Map();

    const mkVortex = (el) => {
      if (vortices.has(el)) return;
      vortices.set(el, new Vortex(el, { particleCountBase: 90 }));
    };
    const rmVortex = (el) => {
      const v = vortices.get(el);
      if (v?.destroy) v.destroy();
      vortices.delete(el);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("reveal");
            mkVortex(e.target);
          } else {
            e.target.classList.remove("reveal");
            rmVortex(e.target);
          }
        }
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.3 }
    );

    items.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      items.forEach(rmVortex);
    };
  }, [selector]);
}