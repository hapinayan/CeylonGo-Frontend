export type CommunityAuthorType = 'traveler' | 'provider' | 'admin';

export type CommunityActorContext = 'traveler' | 'provider';

export type CommunityReportEntityType = 'post' | 'comment';

export interface CommunityAuthorProfile {
  id: number;
  full_name: string;
  author_type: CommunityAuthorType;
  provider_profile_id: number | null;
  provider_business_name: string | null;
  provider_district: string | null;
  is_verified_provider: boolean;
  member_since: string;
}

export interface CommunityPostMediaItem {
  id: number;
  post_id: number;
  media_type: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  created_at: string;
}

export interface CommunityPostDetails {
  id: number;
  author_id: number;
  author_name: string;
  author_type: CommunityAuthorType;
  author: CommunityAuthorProfile;
  body: string;
  visibility: 'visible' | 'hidden' | 'deleted' | string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  viewer_has_liked: boolean;
  viewer_has_saved: boolean;
  media: CommunityPostMediaItem[];
}

export interface CommunityCommentDetails {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  author_type: CommunityAuthorType;
  author: CommunityAuthorProfile;
  body: string;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CommunityFeedFilters {
  search?: string | null;
  author_id?: number | null;
  author_type?: 'traveler' | 'provider' | null;
  page?: number;
  page_size?: number;
}

export interface CommunityLikeStatus {
  post_id: number;
  liked: boolean;
  likes_count: number;
}

export interface CommunitySaveStatus {
  post_id: number;
  saved: boolean;
}

export interface CommunityReportCreateRequest {
  entity_type: CommunityReportEntityType;
  entity_id: number;
  reason: string;
  description?: string | null;
}

export interface CommunityReportDetails {
  id: number;
  reporter_id: number;
  reporter_name: string | null;
  entity_type: string;
  entity_id: number;
  reason: string;
  description: string | null;
  status: string;
  reviewed_by: number | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const COMMUNITY_REPORT_REASONS: readonly string[] = [
  'Spam or misleading promotion',
  'Inappropriate or explicit content',
  'Harassment or hate speech',
  'False travel information',
  'Safety concern or scam',
];
