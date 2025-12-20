'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 루트는 항상 /solar로 리다이렉트
    router.replace('/solar');
  }, [router]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ color: '#00ff88', fontSize: 24 }}>
        Loading AUTUS...
      </div>
    </div>
  );
}
