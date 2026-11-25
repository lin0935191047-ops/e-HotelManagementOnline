/**
 * Tiện ích in ấn chuyên dụng cho phiếu dịch vụ & hóa đơn e-Hotel
 * Khắc phục hoàn toàn lỗi khoảng trắng (blank space) ở đầu trang,
 * lỗi cắt chữ (clipping) do modal cố định (fixed) hoặc flex-centering,
 * đảm bảo bản in luôn bắt đầu từ đầu trang A4 với chất lượng sắc nét 100%.
 */
export function printHtmlElement(elementId, title = "Bản In e-Hotel") {
  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  // Xóa iframe in ấn cũ nếu tồn tại
  const existingIframe = document.getElementById("ehotel-print-isolated-iframe");
  if (existingIframe) {
    try {
      existingIframe.remove();
    } catch {}
  }

  // Tạo iframe cô lập chuyên dụng cho in ấn
  const iframe = document.createElement("iframe");
  iframe.id = "ehotel-print-isolated-iframe";
  iframe.setAttribute(
    "style",
    "position: fixed; top: -9999px; left: -9999px; width: 800px; height: 1100px; border: none; z-index: -1;"
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-size: 13px;
            line-height: 1.5;
            width: 100% !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .no-print {
            display: none !important;
          }
          #${elementId} {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
          }
          img, svg {
            max-width: 100%;
          }
        </style>
      </head>
      <body>
        ${elem.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  // Đợi tài nguyên được render hoàn tất trong iframe rồi kích hoạt hộp thoại in
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.warn("Lỗi in qua iframe, chuyển về window.print():", err);
      window.print();
    } finally {
      // Dọn dẹp iframe sau khi in xong
      setTimeout(() => {
        try {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        } catch {}
      }, 3000);
    }
  }, 250);
}
