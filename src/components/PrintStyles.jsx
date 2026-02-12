import { useEffect } from "react";

const PrintStyles = () => {
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-print", "true");
    style.textContent = `
      @media print {
        body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        [data-no-print] { display: none !important; }
        [data-print-root] {
          background: white !important;
          min-height: auto !important;
          padding: 0 !important;
        }
        [data-print-header] { color: #0f172a !important; }
        [data-print-week] { color: #475569 !important; }
        [data-print-grid] {
          border: 1px solid #cbd5e1 !important;
          border-radius: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  return null;
};

export default PrintStyles;
