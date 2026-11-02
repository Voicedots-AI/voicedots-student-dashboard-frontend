import { useEffect, useState } from "react";

/** Reuses the domain panel's complete, aligned image frames. */
export function PlacementOfficerAvatar({ speaking, analyser }: { speaking: boolean; analyser: AnalyserNode | null }) {
  const [frame, setFrame] = useState("neutral");
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;
    let mouthOpen = false;
    let animationFrame = 0;
    let openness = 0;
    const waveform = analyser ? new Uint8Array(analyser.fftSize) : null;
    function animateSpeech() {
      if (disposed) return;
      if (analyser && waveform) {
        analyser.getByteTimeDomainData(waveform);
        let sumSquares = 0;
        for (const value of waveform) sumSquares += ((value - 128) / 128) ** 2;
        const rms = Math.sqrt(sumSquares / waveform.length);
        const target = Math.max(0, Math.min(1, (rms - 0.012) / 0.105));
        openness += (target - openness) * (target > openness ? 0.58 : 0.3);
        // One talking image cannot show different vowel shapes. Insert brief
        // resting frames during voiced syllables so sustained audio does not
        // leave the mouth frozen open. Silence still closes it immediately.
        const syllableOpen = performance.now() % 260 < 175;
        setFrame(openness < 0.055 || !syllableOpen ? "neutral" : "talking");
        animationFrame = requestAnimationFrame(animateSpeech);
      } else {
        mouthOpen = !mouthOpen;
        setFrame(mouthOpen ? "talking" : "neutral");
        timer = setTimeout(animateSpeech, mouthOpen ? 180 : 110);
      }
    }
    function animate() {
      if (disposed) return;
      if (speaking) {
        animateSpeech();
      } else {
        setFrame("neutral");
        timer = setTimeout(() => {
          if (disposed) return;
          setFrame("idle");
          timer = setTimeout(animate, 160);
        }, reducedMotion.matches ? 5000 : 2400 + Math.random() * 1600);
      }
    }
    function restart() { clearTimeout(timer); cancelAnimationFrame(animationFrame); animate(); }
    restart();
    reducedMotion.addEventListener("change", restart);
    return () => { disposed = true; clearTimeout(timer); cancelAnimationFrame(animationFrame); reducedMotion.removeEventListener("change", restart); };
  }, [speaking, analyser]);
  return <div className="officer-portrait" role="img" aria-label="Dr. Rajesh, AI placement coach">
    {["neutral", "idle", "talking"].map(state => <img key={state} src={`/assets/panel/stills/domain-${state}.png?v=2`} alt="" aria-hidden="true" draggable={false} className={frame === state ? "is-visible" : ""} />)}
  </div>;
}
