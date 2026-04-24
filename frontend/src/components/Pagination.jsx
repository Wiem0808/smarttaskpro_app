// ══════════════════════════════════════════
// SmartTask Pro — Reusable Pagination Component
// ══════════════════════════════════════════
import { useLang } from '../hooks/useLang';

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) {
  const { t } = useLang();
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalItems <= 10) return null; // Hide if too few items

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        <span>{t('showing')} {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}–{Math.min(currentPage * itemsPerPage, totalItems)} {t('of')} {totalItems}</span>
        <select className="pagination-select" value={itemsPerPage} onChange={e => onItemsPerPageChange(Number(e.target.value))}>
          <option value={10}>10 / {t('page')}</option>
          <option value={25}>25 / {t('page')}</option>
          <option value={50}>50 / {t('page')}</option>
          <option value={100}>100 / {t('page')}</option>
        </select>
      </div>
      <div className="pagination-buttons">
        <button className="pagination-btn" disabled={currentPage <= 1} onClick={() => onPageChange(1)} title="First">«</button>
        <button className="pagination-btn" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} title="Previous">‹</button>
        {start > 1 && <span className="pagination-dots">…</span>}
        {pages.map(p => (
          <button key={p} className={`pagination-btn ${p === currentPage ? 'active' : ''}`} onClick={() => onPageChange(p)}>
            {p}
          </button>
        ))}
        {end < totalPages && <span className="pagination-dots">…</span>}
        <button className="pagination-btn" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} title="Next">›</button>
        <button className="pagination-btn" disabled={currentPage >= totalPages} onClick={() => onPageChange(totalPages)} title="Last">»</button>
      </div>
    </div>
  );
}
