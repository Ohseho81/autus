/**
 * Notion API - 리포트 저장 (온리쌤)
 * 리포트 본문을 Notion 페이지로 저장하고 URL 반환
 */
import { logger } from '@/lib/logger';

const NOTION_VERSION = '2022-06-28';

export interface CreateReportResult {
  url: string | null;
  error?: string;
}

/**
 * Notion 페이지 생성 (리포트용)
 * @param title 페이지 제목
 * @param content 마크다운/텍스트 본문
 * @returns 생성된 페이지 URL 또는 null (설정 미비 시)
 */
export async function createReportPage(
  title: string,
  content: string
): Promise<CreateReportResult> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;
  const pageId = process.env.NOTION_PAGE_ID;

  if (!apiKey) {
    return { url: null, error: 'NOTION_API_KEY not configured' };
  }

  const parent = databaseId
    ? { database_id: databaseId }
    : pageId
      ? { page_id: pageId }
      : null;

  if (!parent) {
    return { url: null, error: 'NOTION_DATABASE_ID or NOTION_PAGE_ID required' };
  }

  const truncatedTitle = title.slice(0, 2000);
  const truncatedContent = content.slice(0, 2000);

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({
        parent,
        properties: databaseId
          ? { title: { title: [{ text: { content: truncatedTitle } }] } }
          : { title: { title: [{ text: { content: truncatedTitle } }] } },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: truncatedContent } }],
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error('Notion API error', new Error(errBody), { status: res.status });
      return { url: null, error: `Notion API ${res.status}: ${errBody.slice(0, 200)}` };
    }

    const data = (await res.json()) as { url?: string };
    const url = data.url || null;
    logger.info('Notion report page created', { title: truncatedTitle.slice(0, 50), url });
    return { url };
  } catch (error) {
    logger.error(
      'Failed to create Notion page',
      error instanceof Error ? error : new Error(String(error)),
      { title: truncatedTitle.slice(0, 50) }
    );
    return {
      url: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
