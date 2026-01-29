/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💬 대치동 AI 어시스턴트 - 풀스크린 페이지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import DaechiAssistant from '../components/chat/DaechiAssistant';

const DaechiChatPage: React.FC = () => {
  return (
    <div className="h-screen bg-gray-950">
      <DaechiAssistant embedded={true} />
    </div>
  );
};

export default DaechiChatPage;
