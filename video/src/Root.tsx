import { Composition } from "remotion";
import { PiShowcase } from "./PiShowcase";
import { video } from "./lib/theme";

export const Root: React.FC = () => {
  // Title (3s) + 5 clips with padding + Closing (3s)
  const clipFrames = [9.2, 18.6, 9, 12.2, 12.8].map((d) => Math.ceil(d * video.fps) + 15);
  const totalDuration = 3 * video.fps + clipFrames.reduce((a, b) => a + b, 0) + 3 * video.fps;

  return (
    <Composition
      id="PiShowcase"
      component={PiShowcase}
      durationInFrames={totalDuration}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
  );
};
