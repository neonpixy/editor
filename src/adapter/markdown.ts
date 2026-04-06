// ─── Markdown Adapter ───
// Two-way markdown <-> HTML conversion for .idea persistence.
// The daemon stores markdown; TipTap works in HTML. These bridge the gap.
// Not pixel-perfect — intermediate format until we go digit-native.

// ─── Markdown → HTML ───

export function markdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return '<p></p>';

  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks (fenced)
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing ```
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      htmlParts.push(`<pre><code${langAttr}>${codeLines.join('\n')}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim()) || /^_{3,}$/.test(line.trim())) {
      htmlParts.push('<hr>');
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      htmlParts.push(`<blockquote><p>${inlineMarkdown(quoteLines.join(' '))}</p></blockquote>`);
      continue;
    }

    // Task list items
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)/);
    if (taskMatch) {
      const taskItems: string[] = [];
      while (i < lines.length) {
        const tm = lines[i].match(/^[-*]\s+\[([ xX])\]\s+(.*)/);
        if (!tm) break;
        const checked = tm[1] !== ' ' ? ' data-checked="true"' : '';
        taskItems.push(`<li data-type="taskItem"${checked}><label><input type="checkbox"${tm[1] !== ' ' ? ' checked' : ''}>${inlineMarkdown(tm[2])}</label></li>`);
        i++;
      }
      htmlParts.push(`<ul data-type="taskList">${taskItems.join('')}</ul>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li><p>${inlineMarkdown(lines[i].replace(/^[-*]\s+/, ''))}</p></li>`);
        i++;
      }
      htmlParts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+/);
    if (olMatch) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li><p>${inlineMarkdown(lines[i].replace(/^\d+\.\s+/, ''))}</p></li>`);
        i++;
      }
      htmlParts.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph (default)
    htmlParts.push(`<p>${inlineMarkdown(line)}</p>`);
    i++;
  }

  return htmlParts.join('');
}

// ─── HTML → Markdown ───

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  // Use DOMParser (available in Tauri WebView)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return walkNodes(doc.body.childNodes).trim();
}

function walkNodes(nodes: NodeListOf<ChildNode>): string {
  const parts: string[] = [];

  for (const node of Array.from(nodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? '');
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case 'h1':
        parts.push(`# ${getInlineText(el)}\n\n`);
        break;
      case 'h2':
        parts.push(`## ${getInlineText(el)}\n\n`);
        break;
      case 'h3':
        parts.push(`### ${getInlineText(el)}\n\n`);
        break;
      case 'h4':
        parts.push(`#### ${getInlineText(el)}\n\n`);
        break;
      case 'h5':
        parts.push(`##### ${getInlineText(el)}\n\n`);
        break;
      case 'h6':
        parts.push(`###### ${getInlineText(el)}\n\n`);
        break;
      case 'p':
        parts.push(`${getInlineText(el)}\n\n`);
        break;
      case 'blockquote': {
        const inner = walkNodes(el.childNodes).trim();
        const quoted = inner.split('\n').map(l => `> ${l}`).join('\n');
        parts.push(`${quoted}\n\n`);
        break;
      }
      case 'ul': {
        const isTaskList = el.getAttribute('data-type') === 'taskList';
        for (const li of Array.from(el.children)) {
          if (isTaskList || li.getAttribute('data-type') === 'taskItem') {
            const checked = li.getAttribute('data-checked') === 'true'
              || li.querySelector('input[type="checkbox"]:checked') !== null;
            const text = getInlineText(li as HTMLElement);
            parts.push(`- [${checked ? 'x' : ' '}] ${text}\n`);
          } else {
            parts.push(`- ${getInlineText(li as HTMLElement)}\n`);
          }
        }
        parts.push('\n');
        break;
      }
      case 'ol': {
        let idx = 1;
        for (const li of Array.from(el.children)) {
          parts.push(`${idx}. ${getInlineText(li as HTMLElement)}\n`);
          idx++;
        }
        parts.push('\n');
        break;
      }
      case 'pre': {
        const code = el.querySelector('code');
        const lang = code?.className?.replace('language-', '') ?? '';
        const text = code?.textContent ?? el.textContent ?? '';
        parts.push(`\`\`\`${lang}\n${text}\n\`\`\`\n\n`);
        break;
      }
      case 'code':
        parts.push(`\`${el.textContent ?? ''}\``);
        break;
      case 'strong':
      case 'b':
        parts.push(`**${getInlineText(el)}**`);
        break;
      case 'em':
      case 'i':
        parts.push(`*${getInlineText(el)}*`);
        break;
      case 'del':
      case 's':
        parts.push(`~~${getInlineText(el)}~~`);
        break;
      case 'u':
        // Markdown has no underline — pass through as-is
        parts.push(getInlineText(el));
        break;
      case 'a': {
        const href = el.getAttribute('href') ?? '';
        parts.push(`[${getInlineText(el)}](${href})`);
        break;
      }
      case 'img': {
        const src = el.getAttribute('src') ?? '';
        const alt = el.getAttribute('alt') ?? '';
        parts.push(`![${alt}](${src})\n\n`);
        break;
      }
      case 'hr':
        parts.push('---\n\n');
        break;
      case 'br':
        parts.push('\n');
        break;
      case 'table':
        parts.push(tableToMarkdown(el) + '\n\n');
        break;
      default:
        // Recurse into unknown elements
        parts.push(walkNodes(el.childNodes));
        break;
    }
  }

  return parts.join('');
}

/** Convert a table element to markdown table syntax. */
function tableToMarkdown(table: HTMLElement): string {
  const rows: string[][] = [];
  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const cells: string[] = [];
    for (const cell of Array.from(tr.children)) {
      cells.push((cell.textContent ?? '').trim());
    }
    rows.push(cells);
  }

  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map(r => r.length));
  const lines: string[] = [];

  // Header row
  const header = rows[0] ?? [];
  lines.push('| ' + Array.from({ length: colCount }, (_, i) => header[i] ?? '').join(' | ') + ' |');
  lines.push('| ' + Array.from({ length: colCount }, () => '---').join(' | ') + ' |');

  // Data rows
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    lines.push('| ' + Array.from({ length: colCount }, (_, i) => row[i] ?? '').join(' | ') + ' |');
  }

  return lines.join('\n');
}

/** Get inline text from an element, handling nested inline formatting. */
function getInlineText(el: HTMLElement): string {
  const parts: string[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? '');
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as HTMLElement;
      const tag = child.tagName.toLowerCase();
      const text = getInlineText(child);

      switch (tag) {
        case 'strong':
        case 'b':
          parts.push(`**${text}**`);
          break;
        case 'em':
        case 'i':
          parts.push(`*${text}*`);
          break;
        case 'del':
        case 's':
          parts.push(`~~${text}~~`);
          break;
        case 'code':
          parts.push(`\`${child.textContent ?? ''}\``);
          break;
        case 'a':
          parts.push(`[${text}](${child.getAttribute('href') ?? ''})`);
          break;
        case 'br':
          parts.push('\n');
          break;
        case 'label':
        case 'p':
          // Unwrap labels/paragraphs inside list items
          parts.push(text);
          break;
        case 'input':
          // Skip checkboxes — handled by task list logic
          break;
        default:
          parts.push(text);
          break;
      }
    }
  }
  return parts.join('');
}

// ─── Inline Markdown Processing ───

/** Convert inline markdown syntax to HTML. */
function inlineMarkdown(text: string): string {
  let result = escapeHtml(text);

  // Images: ![alt](src)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Italic: *text* (must come after bold)
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code: `text`
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  return result;
}

/** Escape HTML special characters. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
