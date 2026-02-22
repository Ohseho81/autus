/**
 * 카카오 오픈빌더 스킬 API
 * POST /api/kakao/skill/attend
 * POST /api/kakao/skill/absent
 * POST /api/kakao/skill/makeup-confirm
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  handleAttendSkill,
  handleAbsentSkill,
  handleMakeupConfirmSkill,
  KakaoSkillRequest,
} from '../../../../src/services/kakaoChatbot';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;
  const request: KakaoSkillRequest = req.body;

  console.log('[Kakao Skill]', action, JSON.stringify(request, null, 2));

  try {
    let response;

    switch (action) {
      case 'attend':
        response = await handleAttendSkill(request);
        break;

      case 'absent':
        response = await handleAbsentSkill(request);
        break;

      case 'makeup-confirm':
        response = await handleMakeupConfirmSkill(request);
        break;

      default:
        return res.status(400).json({
          version: '2.0',
          template: {
            outputs: [
              {
                simpleText: {
                  text: '알 수 없는 요청입니다.',
                },
              },
            ],
          },
        });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('[Kakao Skill Error]', error);
    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: '처리 중 오류가 발생했습니다. 학원으로 연락해주세요.',
            },
          },
        ],
      },
    });
  }
}
