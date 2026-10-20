import { useEffect } from "react";

//Tuning knobs
const IDLE_DELAY_MS= 3000; //quiet time before color starts to deepen
const DRIFT_SECONDS= 40; //time to go from original to deepest blue
const RECOVER_SECONDS= 12; //base time to return after one interaction
const WINDOW_MS= 4000; // how far back then interactions are counted

const EVENTS= ["pointerdown", "keydown", "wheel"] as const;

export function useIdleColor(){
    useEffect(()=> {
        const root= document.documentElement;
        let warmth =0 ; // 0=deepest color 1=original
        let lastInteraction = performance.now();
        let taps: number[] = [];
        let lastFrame = performance.now();
        let applied= "";
        let frame = 0;

        const onInteract = () => {
            const now = performance.now();
            lastInteraction = now;
            taps.push(now);
        };

        const tick = (now: number) => {
            const dt = Math.min((now - lastFrame) / 1000, 0.1);
            lastFrame = now;
            taps = taps.filter((t) => now - t < WINDOW_MS);

            if(now - lastInteraction < IDLE_DELAY_MS){
                const speed = (1 + taps.length) / RECOVER_SECONDS;
                warmth =  Math.max(0, warmth - speed * dt);

            }else {
                warmth = Math.min(1, warmth + dt / DRIFT_SECONDS);

            }


            const eased = warmth * warmth * (3 - 2 * warmth);
            const value = `${(eased * 100).toFixed(1)}%`;
            if( value !== applied){
                root.style.setProperty("--accent", `color-mix(in oklab, var(--accent-deep) ${value}, var(--accent-base))`);
           
                applied = value;
            }

            frame = requestAnimationFrame(tick);
        };


        EVENTS.forEach((e) => window.addEventListener(e, onInteract, {passive: true}));
        frame = requestAnimationFrame(tick);

        return () => {
            EVENTS.forEach((e)=>  window.removeEventListener(e, onInteract));
            cancelAnimationFrame(frame);
        };
    }, []);
}