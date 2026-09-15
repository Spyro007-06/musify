export const ERROR_MESSAGES = {
  // Generic
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Validation failed. Please check your input.',
  UNAUTHORIZED: 'Authentication required. Please log in.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  TOO_MANY_REQUESTS: 'Too many requests. Please slow down.',
  BAD_REQUEST: 'Bad request. Invalid input provided.',

  // Auth
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  USERNAME_ALREADY_EXISTS: 'This username is already taken.',
  ACCOUNT_NOT_VERIFIED: 'Please verify your email address before logging in.',
  ACCOUNT_LOCKED: 'Your account has been temporarily locked due to multiple failed login attempts.',
  ACCOUNT_INACTIVE: 'Your account has been deactivated. Please contact support.',
  INVALID_TOKEN: 'Invalid or expired token.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  REFRESH_TOKEN_INVALID: 'Invalid refresh token.',
  OTP_INVALID: 'Invalid or expired OTP.',
  OTP_ALREADY_USED: 'This OTP has already been used.',
  PASSWORD_SAME_AS_OLD: 'New password must be different from the current password.',
  WRONG_PASSWORD: 'Current password is incorrect.',

  // Users
  USER_NOT_FOUND: 'User not found.',

  // Tracks
  TRACK_NOT_FOUND: 'Track not found.',
  TRACK_ALREADY_LIKED: 'Track is already in your liked songs.',
  TRACK_NOT_LIKED: 'Track is not in your liked songs.',

  // Albums
  ALBUM_NOT_FOUND: 'Album not found.',

  // Artists
  ARTIST_NOT_FOUND: 'Artist not found.',
  ALREADY_FOLLOWING: 'You are already following this artist.',
  NOT_FOLLOWING: 'You are not following this artist.',

  // Playlists
  PLAYLIST_NOT_FOUND: 'Playlist not found.',
  PLAYLIST_ACCESS_DENIED: 'You do not have access to this playlist.',
  TRACK_ALREADY_IN_PLAYLIST: 'Track is already in this playlist.',
  TRACK_NOT_IN_PLAYLIST: 'Track is not in this playlist.',

  // Uploads
  FILE_NOT_PROVIDED: 'No file was provided.',
  INVALID_FILE_TYPE: 'Invalid file type.',
  FILE_TOO_LARGE: 'File size exceeds the allowed limit.',

  // Subscriptions
  PLAN_NOT_FOUND: 'Subscription plan not found.',
  SUBSCRIPTION_NOT_FOUND: 'No active subscription found.',
  ALREADY_SUBSCRIBED: 'You already have an active subscription.',

  // Stream
  PREMIUM_REQUIRED: 'This feature requires a Premium subscription.',
} as const;

export const SUCCESS_MESSAGES = {
  // Auth
  SIGNUP_SUCCESS: 'Account created successfully. Please verify your email.',
  LOGIN_SUCCESS: 'Logged in successfully.',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  EMAIL_VERIFIED: 'Email verified successfully.',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  OTP_SENT: 'OTP sent to your email address.',
  TOKEN_REFRESHED: 'Access token refreshed.',

  // Tracks
  TRACK_LIKED: 'Track added to your liked songs.',
  TRACK_UNLIKED: 'Track removed from your liked songs.',

  // Artists
  ARTIST_FOLLOWED: 'Artist followed successfully.',
  ARTIST_UNFOLLOWED: 'Artist unfollowed successfully.',

  // Playlists
  PLAYLIST_CREATED: 'Playlist created successfully.',
  PLAYLIST_UPDATED: 'Playlist updated successfully.',
  PLAYLIST_DELETED: 'Playlist deleted successfully.',
  TRACK_ADDED_TO_PLAYLIST: 'Track added to playlist.',
  TRACK_REMOVED_FROM_PLAYLIST: 'Track removed from playlist.',

  // Uploads
  UPLOAD_SUCCESS: 'File uploaded successfully.',

  // Admin
  CREATED: 'Created successfully.',
  UPDATED: 'Updated successfully.',
  DELETED: 'Deleted successfully.',
} as const;

export const OTP_TYPES = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const;

export type OtpType = (typeof OTP_TYPES)[keyof typeof OTP_TYPES];

