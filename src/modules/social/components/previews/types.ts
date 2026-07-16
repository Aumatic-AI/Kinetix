export interface PreviewAccount {
  displayName: string;
  avatarUrl?: string;
}

export interface PlatformPreviewProps {
  platform: "facebook" | "instagram" | "youtube" | "x" | "linkedin" | "tiktok";
  account: PreviewAccount;
  caption: string;
  title?: string;
  mediaUrl: string;
  mediaType: "image" | "video";
}
