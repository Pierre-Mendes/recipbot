import { extractPageContent } from './html-extractor.util';
import { MAX_EXTRACTED_TEXT_LENGTH } from './scraping.constants';

describe('extractPageContent', () => {
  it('prefers og:title over the <title> tag', () => {
    const html = `
      <html>
        <head>
          <title>Fallback Title</title>
          <meta property="og:title" content="Bolo de Cenoura da Vovó" />
        </head>
        <body><p>Some content</p></body>
      </html>
    `;
    expect(extractPageContent(html).title).toBe('Bolo de Cenoura da Vovó');
  });

  it('falls back to <title> when og:title is absent', () => {
    const html = `<html><head><title>Recipe Page</title></head><body>text</body></html>`;
    expect(extractPageContent(html).title).toBe('Recipe Page');
  });

  it('returns null title when neither is present', () => {
    const html = `<html><body>text</body></html>`;
    expect(extractPageContent(html).title).toBeNull();
  });

  it('strips scripts, styles, and nav/footer chrome from the extracted text', () => {
    const html = `
      <html>
        <body>
          <nav>Home | About</nav>
          <script>trackUser();</script>
          <style>.hidden { display: none; }</style>
          <p>Mix flour and sugar.</p>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;
    const { text } = extractPageContent(html);
    expect(text).toContain('Mix flour and sugar.');
    expect(text).not.toContain('trackUser');
    expect(text).not.toContain('display: none');
    expect(text).not.toContain('Home | About');
    expect(text).not.toContain('Copyright 2026');
  });

  it('collapses whitespace', () => {
    const html = `<body><p>Line one</p>\n\n<p>   Line   two   </p></body>`;
    const { text } = extractPageContent(html);
    expect(text).not.toMatch(/\s{2,}/);
    expect(text).toBe('Line one Line two');
  });

  it('truncates text to the configured maximum length', () => {
    const longParagraph = 'a'.repeat(MAX_EXTRACTED_TEXT_LENGTH + 5000);
    const html = `<body><p>${longParagraph}</p></body>`;
    const { text } = extractPageContent(html);
    expect(text.length).toBe(MAX_EXTRACTED_TEXT_LENGTH);
  });
});
