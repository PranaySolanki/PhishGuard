export const colors = {
  bg: '#0d0d14',
  card: '#141420',
  cardDeep: '#0a0a12',
  border: '#1e1e2e',
  accent: '#2a4fd6',
  accentLight: '#6fa8f5',
  danger: '#e24b4a',
  dangerBg: '#3a1a1a',
  dangerText: '#f07070',
  warning: '#ef9f27',
  warningBg: '#3a2a0a',
  warningText: '#f5a623',
  safe: '#1d9e75',
  safeBg: '#1a3a1a',
  safeText: '#3db87a',
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  textFaint: '#555555',
};

export const getRiskColor = (score: number) =>
  score >= 70 ? colors.danger : score >= 40 ? colors.warning : colors.safe;
export const getRiskBg = (score: number) =>
  score >= 70 ? colors.dangerBg : score >= 40 ? colors.warningBg : colors.safeBg;
export const getRiskText = (score: number) =>
  score >= 70 ? colors.dangerText : score >= 40 ? colors.warningText : colors.safeText;
export const getVerdict = (score: number): 'High Risk' | 'Suspicious' | 'Safe' =>
  score >= 70 ? 'High Risk' : score >= 40 ? 'Suspicious' : 'Safe';
