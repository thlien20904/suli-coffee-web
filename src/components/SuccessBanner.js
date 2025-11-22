import { useState, useEffect } from 'react';
import '../styles/SuccessBanner.css';

export default function SuccessBanner({ message, duration = 3000, onClose }) {
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(true);

  console.log('🎉 SuccessBanner rendered:', message);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 50));
        if (newProgress <= 0) {
          clearInterval(interval);
          setVisible(false);
          setTimeout(() => onClose && onClose(), 300);
          return 0;
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className="success-banner">
      <span>{message}</span>
      <div className="success-progress" style={{ width: `${progress}%` }}></div>
    </div>
  );
}

// Hook để dùng SuccessBanner
export function useSuccessBanner() {
  const [banners, setBanners] = useState([]);

  const showBanner = (message, duration = 3000) => {
    const id = Date.now();
    console.log('🚀 showBanner called:', message, 'id:', id);
    setBanners(prev => [...prev, { id, message, duration }]);
  };

  const removeBanner = (id) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const BannerContainer = () => (
    <>
      {banners.map(banner => (
        <SuccessBanner
          key={banner.id}
          message={banner.message}
          duration={banner.duration}
          onClose={() => removeBanner(banner.id)}
        />
      ))}
    </>
  );

  return { showBanner, BannerContainer };
}
