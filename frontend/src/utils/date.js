/**
 * Tiện ích định dạng ngày & giờ theo giờ địa phương (Local Timezone - vi-VN)
 * Khắc phục hoàn toàn lỗi lệch ngày do chuyển đổi qua lại với chuẩn UTC (toISOString)
 */

/**
 * Chuyển đổi an toàn chuỗi ngày hoặc Date thành đối tượng Date theo giờ địa phương
 * Tránh lỗi JavaScript mặc định parse chuỗi 'YYYY-MM-DD' thành 00:00:00 UTC
 * @param {string|Date|number} dateInput 
 * @returns {Date}
 */
export const parseLocalDate = (dateInput) => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  if (typeof dateInput === "string") {
    // Xử lý chuỗi định dạng YYYY-MM-DD
    const dateOnlyMatch = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      return new Date(year, month, day);
    }
  }

  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Định dạng Date thành chuỗi 'YYYY-MM-DD' theo giờ địa phương (dành cho input type="date")
 * Thay thế an toàn cho Date.toISOString().split('T')[0] vốn luôn dùng giờ UTC
 * @param {string|Date|number} dateInput 
 * @returns {string} ví dụ: '2026-11-04'
 */
export const formatLocalDateToInput = (dateInput = new Date()) => {
  const d = parseLocalDate(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Lấy ngày hôm nay dưới dạng 'YYYY-MM-DD' theo giờ địa phương
 * @returns {string}
 */
export const getTodayLocalDateString = () => {
  return formatLocalDateToInput(new Date());
};

/**
 * Lấy ngày mai dưới dạng 'YYYY-MM-DD' theo giờ địa phương
 * @param {string|Date} baseDate - Ngày mốc (mặc định là hôm nay)
 * @returns {string}
 */
export const getTomorrowLocalDateString = (baseDate) => {
  const d = baseDate ? parseLocalDate(baseDate) : new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDateToInput(d);
};

/**
 * Định dạng ngày hiển thị thân thiện tiếng Việt theo giờ địa phương
 * @param {string|Date|number} dateInput 
 * @param {Intl.DateTimeFormatOptions} [customOptions] 
 * @returns {string} ví dụ: 'Thứ 4, 04/11/2026'
 */
export const formatDateDisplay = (dateInput, customOptions = {}) => {
  if (!dateInput) return "";
  const d = parseLocalDate(dateInput);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...customOptions,
  });
};

/**
 * Định dạng ngày ngắn gọn theo giờ địa phương
 * @param {string|Date|number} dateInput 
 * @returns {string} ví dụ: '04/11/2026'
 */
export const formatDateShort = (dateInput) => {
  if (!dateInput) return "";
  const d = parseLocalDate(dateInput);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Định dạng ngày và giờ chi tiết theo giờ địa phương
 * @param {string|Date|number} dateInput 
 * @param {Intl.DateTimeFormatOptions} [customOptions] 
 * @returns {string} ví dụ: '14:30 04/11/2026'
 */
export const formatDateTimeDisplay = (dateInput, customOptions = {}) => {
  if (!dateInput) return "";
  const d = parseLocalDate(dateInput);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...customOptions,
  });
};

