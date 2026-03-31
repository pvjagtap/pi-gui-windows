import { Series } from "remotion";
import { TitleCard } from "./scenes/TitleCard";
import { FeatureScene } from "./scenes/FeatureScene";
import { ClosingCard } from "./scenes/ClosingCard";
import { video } from "./lib/theme";

const { fps } = video;

// Clip durations (seconds) — from ffprobe of actual captured content
const clipDurations = {
  parallel: 9.2,
  slash: 18.6,
  skills: 12.8,
  explorer: 9,
  diff: 12.2,
};

export const PiShowcase: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={3 * fps}>
        <TitleCard />
      </Series.Sequence>

      <Series.Sequence durationInFrames={Math.ceil(clipDurations.parallel * fps) + 15}>
        <FeatureScene
          clip="parallel-sessions.mp4"
          label="Run multiple sessions in parallel"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={Math.ceil(clipDurations.slash * fps) + 15}>
        <FeatureScene
          clip="slash-commands.mp4"
          label="Context-aware command palette"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={Math.ceil(clipDurations.explorer * fps) + 15}>
        <FeatureScene
          clip="file-explorer.mp4"
          label="File explorer & changed files panel"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={Math.ceil(clipDurations.diff * fps) + 15}>
        <FeatureScene
          clip="diff-viewer.mp4"
          label="Side-by-side diff viewer"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={Math.ceil(clipDurations.skills * fps) + 15}>
        <FeatureScene
          clip="skills-settings.mp4"
          label="Workspace-scoped skills & config"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={3 * fps}>
        <ClosingCard />
      </Series.Sequence>
    </Series>
  );
};
