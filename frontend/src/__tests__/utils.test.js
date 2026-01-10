import { cn, getProfileImageUrl, DEFAULT_PROFILE_IMAGE } from '../lib/utils';

describe('cn (className utility)', () => {
  test('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  test('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible');
  });

  test('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('getProfileImageUrl', () => {
  test('returns default image for null', () => {
    expect(getProfileImageUrl(null)).toBe(DEFAULT_PROFILE_IMAGE);
  });

  test('returns default image for undefined', () => {
    expect(getProfileImageUrl(undefined)).toBe(DEFAULT_PROFILE_IMAGE);
  });

  test('returns default image for empty string', () => {
    expect(getProfileImageUrl('')).toBe(DEFAULT_PROFILE_IMAGE);
    expect(getProfileImageUrl('   ')).toBe(DEFAULT_PROFILE_IMAGE);
  });

  test('returns URL as-is for absolute URLs', () => {
    const url = 'https://example.com/image.jpg';
    expect(getProfileImageUrl(url)).toBe(url);
  });

  test('prepends backend URL for upload paths', () => {
    const path = '/uploads/profile_images/test.jpg';
    const result = getProfileImageUrl(path);
    expect(result).toContain(path);
    expect(result).toMatch(/^http/);
  });
});
