/**
 * Theme hook connected to Vitalia ThemeContext
 */

import { Colors } from '@/constants/theme';
import { useTheme as useVitaliaTheme } from '@/theme/theme';

export function useTheme() {
  const vitaliaTheme = useVitaliaTheme();
  const theme = vitaliaTheme.dark ? 'dark' : 'light';

  return Colors[theme];
}
