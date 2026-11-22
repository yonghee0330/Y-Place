// 이번 주 매체 추천 신간 목록. 고르면 "지금 읽는 책"으로 펼칠 수 있다(본문 없음).
import {
  CURRENT_WEEK, sourceName, type NewReleaseBook,
} from '../reader/newReleases';
import type { ReadingBook } from '../reader/book';
import { Sheet } from './sheet';

export class NewReleaseSheet {
  readonly sheet = new Sheet('이번 주 신간', 'new-release-sheet');
  private list: HTMLElement;
  private detail: HTMLElement;
  private onPick: ((book: ReadingBook) => void) | null = null;
  private filter = 'all';

  constructor() {
    this.sheet.el.classList.add('new-release-sheet');
    this.sheet.body.innerHTML = `
      <p class="sheet-text" data-intro></p>
      <div class="nr-filters" data-filters role="tablist" aria-label="매체 골라 보기"></div>
      <div class="nr-list" data-list role="list"></div>
      <div class="nr-detail" data-detail hidden></div>`;
    this.list = this.sheet.body.querySelector('[data-list]')!;
    this.detail = this.sheet.body.querySelector('[data-detail]')!;
    const intro = this.sheet.body.querySelector('[data-intro]')!;
    intro.textContent = `${CURRENT_WEEK.label} · ${CURRENT_WEEK.range}. 언론·서점 MD가 소개한 책이에요. 본문은 없고, 고르면 머리 위에 제목을 띄울 수 있어요.`;
    this.buildFilters();
    this.sheet.onClose = () => {
      this.onPick = null;
      this.hideDetail();
    };
  }

  open(onPick: (book: ReadingBook) => void, focusId?: string): void {
    this.onPick = onPick;
    this.filter = 'all';
    this.renderFilters();
    this.renderList();
    this.sheet.open();
    if (focusId && focusId !== '*') {
      const book = CURRENT_WEEK.books.find((b) => b.id === focusId);
      if (book) this.showDetail(book);
    } else {
      this.hideDetail();
    }
  }

  private buildFilters(): void {
    // filled in renderFilters
  }

  private renderFilters(): void {
    const box = this.sheet.body.querySelector('[data-filters]')!;
    const used = new Set(CURRENT_WEEK.books.flatMap((b) => b.sources));
    const opts: { id: string; label: string }[] = [
      { id: 'all', label: '전체' },
      { id: 'featured', label: '대표' },
      ...CURRENT_WEEK.sources.filter((s) => used.has(s.id)).map((s) => ({ id: s.id, label: s.name })),
    ];
    box.replaceChildren();
    for (const o of opts) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nr-filter' + (this.filter === o.id ? ' is-on' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(this.filter === o.id));
      btn.textContent = o.label;
      btn.addEventListener('click', () => {
        this.filter = o.id;
        this.hideDetail();
        this.renderFilters();
        this.renderList();
      });
      box.appendChild(btn);
    }
  }

  private booksForFilter(): NewReleaseBook[] {
    if (this.filter === 'all') return CURRENT_WEEK.books;
    if (this.filter === 'featured') return CURRENT_WEEK.books.filter((b) => b.featured);
    return CURRENT_WEEK.books.filter((b) => b.sources.includes(this.filter));
  }

  private renderList(): void {
    const books = this.booksForFilter();
    this.list.replaceChildren();
    if (!books.length) {
      const empty = document.createElement('p');
      empty.className = 'field-note';
      empty.textContent = '이 매체에 묶인 책이 없어요.';
      this.list.appendChild(empty);
      return;
    }
    for (const b of books) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nr-item';
      btn.setAttribute('role', 'listitem');
      const src = b.sources.map(sourceName).join(' · ');
      btn.innerHTML = `<span class="nr-item-title">${escapeHtml(b.title)}</span>
        <span class="nr-item-meta">${escapeHtml(b.author)} · ${escapeHtml(b.publisher)}</span>
        <span class="nr-item-src">${escapeHtml(src)}</span>`;
      btn.addEventListener('click', () => this.showDetail(b));
      this.list.appendChild(btn);
    }
  }

  private showDetail(b: NewReleaseBook): void {
    this.detail.hidden = false;
    this.list.hidden = true;
    const src = b.sources.map(sourceName).join(' · ');
    const by = b.translator ? `${b.author} · ${b.translator} 옮김` : b.author;
    const meta = [by, b.publisher, b.price, b.published].filter(Boolean).join(' · ');
    this.detail.innerHTML = `
      <button type="button" class="nr-back" data-act="back">← 목록</button>
      <h3 class="nr-detail-title">${escapeHtml(b.title)}</h3>
      <p class="nr-detail-meta">${escapeHtml(meta)}</p>
      <p class="nr-detail-src">${escapeHtml(src)}</p>
      <p class="nr-detail-blurb">${escapeHtml(b.blurb || '소개 문장은 매체 기사에만 있고, 여기에는 짧게 남기지 않았어요.')}</p>
      <div class="sheet-actions">
        <button type="button" class="btn" data-act="close">닫기</button>
        <button type="button" class="btn btn-primary" data-act="read">이 책으로 읽기</button>
      </div>`;
    this.detail.querySelector('[data-act="back"]')!.addEventListener('click', () => this.hideDetail());
    this.detail.querySelector('[data-act="close"]')!.addEventListener('click', () => this.sheet.close());
    this.detail.querySelector('[data-act="read"]')!.addEventListener('click', () => {
      const pick = this.onPick;
      this.sheet.close();
      pick?.({
        title: b.title,
        author: b.author,
        publisher: b.publisher,
        coverUrl: null,
      });
    });
  }

  private hideDetail(): void {
    this.detail.hidden = true;
    this.detail.replaceChildren();
    this.list.hidden = false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}
