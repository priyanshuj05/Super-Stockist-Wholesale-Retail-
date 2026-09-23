import { RetailStorefront } from '../components/RetailStorefront.tsx';

interface StoreViewProps {
  onBackToLogin?: () => void;
}

export function StoreView(props: StoreViewProps) {
  return <RetailStorefront {...props} />;
}

export { RetailStorefront };
export default StoreView;
