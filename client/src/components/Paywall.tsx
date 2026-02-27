import { useState } from 'react';
import { Trophy, Flag, Globe } from 'lucide-react';
import { usePurchase } from '@/hooks/use-purchase';
import logoImage from '@assets/1Asset_3@2x_1767902844976.png';

interface PaywallProps {
  onBack: () => void;
  onPurchaseSuccess?: () => void;
}

export function Paywall({ onBack, onPurchaseSuccess }: PaywallProps) {
  const { purchase, restore, priceString } = usePurchase();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      await purchase();
      onPurchaseSuccess?.();
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restore();
    } finally {
      setRestoring(false);
    }
  };

  const features = [
    { icon: Trophy, label: 'Career Mode', desc: 'Championship progression' },
    { icon: Flag, label: 'Grand Prix', desc: 'Full race weekends' },
    { icon: Globe, label: 'Multiplayer', desc: '1v1 online racing' },
  ];

  return (
    <div className="h-screen flex flex-col items-center bg-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>
      {/* Logo */}
      <div className="pt-6 pb-4 md:pb-8 flex justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
        <img
          src={logoImage}
          alt="F1 Math Racer"
          className="h-8 md:h-12 object-contain"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24 max-w-sm w-full">
        {/* Title */}
        <h2
          className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-black text-center mb-8"
        >
          Unlock Full Access
        </h2>

        {/* Feature list */}
        <div className="w-full flex flex-col gap-4 mb-10">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4">
              <div
                className="flex items-center justify-center rounded-full shrink-0"
                style={{ width: 40, height: 40, backgroundColor: '#f5f5f5' }}
              >
                <Icon size={18} className="text-gray-800" />
              </div>
              <div>
                <div className="font-bold text-sm uppercase tracking-wider text-black">{label}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Purchase button */}
        <button
          onClick={handlePurchase}
          disabled={purchasing}
          className="w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white transition-opacity"
          style={{
            backgroundColor: '#e10600',
            opacity: purchasing ? 0.6 : 1,
          }}
        >
          {purchasing ? 'Processing...' : `Unlock ${priceString ?? ''}`}
        </button>

        {/* Restore link */}
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
        >
          {restoring ? 'Restoring...' : 'Already purchased? Restore'}
        </button>
      </div>

      {/* Back button — pinned to bottom */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-black transition-colors uppercase tracking-wider"
          style={{ fontFamily: 'Oxanium, sans-serif' }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
