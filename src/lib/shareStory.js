import { normalizeExternalUrl } from "./urls";

const buildShareText = story => {
  const parts = [story.headline];

  if (story.summary) {
    parts.push(story.summary);
  }

  if (story.location) {
    parts.push(`Location: ${story.location}`);
  }

  parts.push("Shared from BrightNews");

  return parts.join("\n\n");
};

export const shareStory = async story => {
  const url = normalizeExternalUrl(story.sourceUrl) || window.location.href;
  const title = `${story.headline} | BrightNews`;
  const text = buildShareText(story);

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return {
        variant: "info",
        message: "Story shared.",
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        return null;
      }
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${text}\n\n${url}`);
    return {
      variant: "info",
      message: "Story link copied.",
    };
  }

  return {
    variant: "error",
    message: "Sharing is not supported on this device.",
  };
};
