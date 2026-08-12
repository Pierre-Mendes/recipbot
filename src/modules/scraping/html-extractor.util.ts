import * as cheerio from 'cheerio';
import { MAX_EXTRACTED_TEXT_LENGTH } from './scraping.constants';

export interface ExtractedPageContent {
  title: string | null;
  text: string;
}

/**
 * Best-effort, site-agnostic extraction: pulls a title (og:title falling
 * back to <title>) and the page's visible text with scripts/styles/nav
 * chrome stripped out. This feeds the OCR-style draft pipeline (US02) —
 * a human still confirms/edits the result, so it doesn't need to be a
 * precise recipe parser.
 */
export function extractPageContent(html: string): ExtractedPageContent {
  const $ = cheerio.load(html);

  $('script, style, noscript, nav, footer, header, svg').remove();

  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const titleTag = $('title').first().text().trim();
  const title = ogTitle || titleTag || null;

  const rawText = $('body').text();
  const text = rawText
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_LENGTH);

  return { title: title || null, text };
}
