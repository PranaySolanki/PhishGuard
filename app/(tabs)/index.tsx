import TextScreen from '../screens/TextScreen';

export default function ScanTab() {
  // Provide a dummy callback for onResult since we don't have global state wired here yet,
  // or manage state inside TextScreen. We will handle this simply for now.
  return <TextScreen onResult={(r) => console.log('Scan result:', r)} />;
}
