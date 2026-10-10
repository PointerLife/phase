import { useWindowDimensions } from 'react-native';

/**
 * Breakpoint used to switch between the phone (one view at a time, bottom tab
 * bar) and tablet (persistent canvas + side panel) layouts.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return { width, height, isWide: width >= 820 };
}
