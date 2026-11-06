export const SUPPORTED_PLATFORMS = [
  { name: "YouTube", platformType: "video", description: "Long-form videos, Music videos, Live streams" },
  { name: "TikTok", platformType: "short_video", description: "Short-form vertical video clips" },
  { name: "Spotify", platformType: "music_streaming", description: "Audio music releases and podcasts" },
  { name: "Instagram", platformType: "short_video", description: "Reels, clips, and creator posts" },
  { name: "Apple Music", platformType: "music_streaming", description: "Audio music releases and streams" },
] as const;

export const CONTENT_TYPES = [
  "music_cover",
  "original_song",
  "short_form",
  "long_form",
  "live_stream",
  "music_release",
  "podcast",
  "other",
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: "id", name: "Indonesian" },
  { code: "en", name: "English" },
  { code: "ja", name: "Japanese" },
  { code: "jv", name: "Javanese" },
  { code: "su", name: "Sundanese" },
  { code: "multi", name: "Multilingual" },
  { code: "inst", name: "Instrumental" },
] as const;

export const CANONICAL_METRICS = [
  { slug: "views", label: "Views / Plays", format: "number" },
  { slug: "likes", label: "Likes / Hearts", format: "number" },
  { slug: "comments", label: "Comments", format: "number" },
  { slug: "shares", label: "Shares / Reposts", format: "number" },
  { slug: "streams", label: "Audio Streams", format: "number" },
  { slug: "watch_time_hours", label: "Watch Time (Hours)", format: "decimal" },
  { slug: "impressions", label: "Impressions", format: "number" },
  { slug: "saves", label: "Saves / Bookmarks", format: "number" },
  { slug: "listeners", label: "Unique Listeners", format: "number" },
] as const;

