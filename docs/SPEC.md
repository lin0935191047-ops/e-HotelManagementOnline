# SOFTWARE SPECIFICATION: e-Hotel Management & Booking Online System

## 1. Kiến trúc & Công nghệ (Tech Stack)
- **Framework:** Next.js 14+ (App Router, Fullstack JavaScript) đáp ứng yêu cầu vận hành trên trình duyệt web phổ biến[cite: 2].
- **Styling & UI:** Tailwind CSS + Shadcn UI.
- **Database & ORM:** PostgreSQL + Prisma ORM (hỗ trợ kiểm tra kiểu dữ liệu nghiêm ngặt).
- **Authentication & Session:** JWT / NextAuth (Custom Credentials) với cơ chế tự động hết hạn phiên (auto-timeout) sau **30 phút** không hoạt động.
- **Lưu trữ hình ảnh:** Lưu trữ trực tiếp dưới dạng mảng đường dẫn URL (`string[]`).
- **In ấn & Xuất báo cáo:**
  - **In phiếu dịch vụ (Service Ticket) & In hóa đơn (Check-out Invoice):** Giao diện HTML chuyên biệt cho in ấn (`@media print`) kích hoạt qua `window.print()`.
  - **Xuất báo cáo doanh thu:** Hỗ trợ tải xuống tệp `.xlsx` (thư viện `exceljs` hoặc `xlsx`) và `.pdf` (thư viện `jspdf` / `pdfmake`).

---

## 2. Ma trận Phân quyền Tách biệt (Strict Disjoint RBAC)
Hệ thống áp dụng cơ chế phân quyền tách biệt hoàn toàn theo đúng đặc tả SRS:

| Vai trò (Role) | Yêu cầu Đăng nhập | Mô-đun được phép truy cập | Mô-đun bị cấm truy cập (HTTP 403) |
| :--- | :--- | :--- | :--- |
| **PUBLIC (Customer)** | Không | Cổng Đặt phòng (`/`, `/rooms`, `/cart`, `/checkout`, `/booking-lookup`) | `/setup/*`, `/operation/*`, `/admin/*` |
| **MANAGER** | Có (Timeout 30p) | **Setup Module** (`/setup/rooms`, `/setup/services`, `/setup/promotions`) | `/operation/*`, `/admin/*` |
| **SALE (Seller)** | Có (Timeout 30p) | **Operation Module** (`/operation/bookings`, `/operation/check-in`, `/operation/services`, `/operation/check-out`, `/operation/reports`) | `/setup/*`, `/admin/*` |
| **ADMIN** | Có (Timeout 30p) | **Admin Module** (`/admin/users`) | `/setup/*`, `/operation/*` |

---

## 3. Thiết kế Cơ sở Dữ liệu (Prisma Schema Specification)

### 3.1. Thực thể Người dùng Nội bộ (`User`)
- `id`: UUID / Int (PK)
- `username`: String (Unique, Required)
- `passwordHash`: String (Required)
- `fullName`: String (Required)
- `role`: Enum (`ADMIN`, `MANAGER`, `SALE`)
- `isActive`: Boolean (Default: `true`)
- `lastActiveAt`: DateTime (Dùng để kiểm tra 30 phút inactivity timeout)

### 3.2. Thực thể Phòng Vật lý & Hạng phòng (`Room`)
Mỗi bản ghi đại diện cho một phòng vật lý trong khách sạn nhưng được nhóm theo `type` và `size` để phục vụ đặt phòng theo số lượng tồn kho hạng phòng:
- `roomId`: String (PK - Ví dụ: `"101"`, `"102"`, `"201"`)
- `type`: Enum (`VIP`, `DELUX`, `LIVING_SUITE`)
- `size`: Enum (`SINGLE`, `DOUBLE`)
- `price`: Decimal (Đơn giá phòng / đêm)
- `maxAdults`: Int (Số người lớn tiêu chuẩn)
- `maxChildren`: Int (Số trẻ em miễn phí tiêu chuẩn)
- `extraChildFee`: Decimal (Định mức phụ thu cho mỗi trẻ em vượt quá tiêu chuẩn / đêm)
- `description`: Text
- `pictures`: String[] (Danh sách URL hình ảnh)
- `status`: Enum (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`)

### 3.3. Thực thể Dịch vụ (`Service`)
- `serviceId`: String (PK)
- `serviceName`: String (Required - VD: Massage, Giặt ủi, Đồ uống, Bữa phụ...)
- `description`: Text
- `unit`: String (Required - VD: Lượt, Kg, Lon, Suất)
- `price`: Decimal (Required, $> 0$)

### 3.4. Thực thể Khuyến mãi (`Promotion`)
- `id`: String (PK)
- `code`: String (Unique, Required - Mã nhập hoặc chọn trên form)
- `name`: String (Required)
- `description`: Text
- `discountType`: Enum (`PERCENTAGE`, `FIXED_AMOUNT`)
- `value`: Decimal (Required - Nếu là `PERCENTAGE` thì $0 < \text{value} \le 100$)
- `startDate`: DateTime (Required)
- `endDate`: DateTime (Required, $\text{endDate} \ge \text{startDate}$)

### 3.5. Thực thể Tài khoản Thanh toán Giả lập (`PaymentAccount`)
- `id`: Int (PK)
- `cardType`: Enum (`ATM`, `VISA`)
- `accountNumber`: String (Unique)
- `accountHolder`: String
- `balance`: Decimal (Required, $\ge 0$)

### 3.6. Thực thể Đơn Đặt phòng (`Booking`) & Chi tiết Hạng phòng (`BookingItem`)
- **`Booking`:**
  - `id`: Int (PK)
  - `bookingNumber`: String (Unique, tự sinh sau khi thanh toán thành công, VD: `BK-20261016-XXXX`)
  - `customerName`: String (Required - Họ tên khách đặt)
  - `customerPhone`: String (Required - Số điện thoại)
  - `customerEmail`: String (Required - Email)
  - `customerCccd`: String (Required - Số CCCD)
  - `fromDate`: DateTime (Ngày nhận phòng dự kiến - chuẩn hóa 14:00)
  - `toDate`: DateTime (Ngày trả phòng dự kiến - chuẩn hóa 12:00)
  - `promotionId`: String? (FK -> `Promotion.id`)
  - `totalRoomFee`: Decimal (Tổng tiền phòng gốc)
  - `discountAmount`: Decimal (Số tiền được giảm từ Promotion)
  - `netRoomFee`: Decimal ($\text{totalRoomFee} - \text{discountAmount}$)
  - `paymentOption`: Enum (`FULL_100`, `DEPOSIT_50`)
  - `prepaidBookingValue`: Decimal (Số tiền khách đã thanh toán online thành công)
  - `paymentAccountNumber`: String (Lưu tài khoản đã thanh toán để hoàn tiền 80% nếu hủy)
  - `cancellationFee`: Decimal? (Lưu 20% phí phạt nếu đơn bị hủy)
  - `refundAmount`: Decimal? (Lưu 80% tiền hoàn lại nếu đơn bị hủy)
  - `status`: Enum (`CONFIRMED`, `CANCELLED`, `CHECKED_IN`, `CHECKED_OUT`)
  - `createdAt`: DateTime (Ngày đặt phòng)
  - `cancelledAt`: DateTime?
  - `checkedOutAt`: DateTime?
- **`BookingItem` (Đặt theo số lượng hạng phòng):**
  - `id`: Int (PK)
  - `bookingId`: Int (FK -> `Booking.id`)
  - `roomType`: Enum (`VIP`, `DELUX`, `LIVING_SUITE`)
  - `roomSize`: Enum (`SINGLE`, `DOUBLE`)
  - `quantity`: Int (Số lượng phòng đặt của hạng này)
  - `unitPrice`: Decimal (Giá 1 đêm tại thời điểm đặt)

### 3.7. Thực thể Gán phòng & Khách lưu trú lúc Check-in (`RoomAssignment` & `StayingGuest`)
- **`RoomAssignment` (Gán phòng vật lý lúc Check-in):**
  - `id`: Int (PK)
  - `bookingId`: Int (FK -> `Booking.id`)
  - `roomId`: String (FK -> `Room.roomId` - Số phòng vật lý như `"101"`, `"102"`)
  - `checkInAt`: DateTime
  - `checkOutAt`: DateTime?
- **`StayingGuest` (Thông tin từng khách khai báo lúc Check-in):**
  - `id`: Int (PK)
  - `bookingId`: Int (FK -> `Booking.id`)
  - `roomAssignmentId`: Int (FK -> `RoomAssignment.id`)
  - `fullName`: String (Required - Họ tên khách lưu trú)
  - `idNumber`: String (Required - Số CCCD/Passport)
  - `birthYear`: Int (Required - Năm sinh)
  - `guestType`: Enum (`ADULT`, `CHILD`)

### 3.8. Thực thể Phiếu Dịch vụ (`ServiceUsage`) & Hóa đơn (`Invoice`)
- **`ServiceUsage` (Ticket):**
  - `ticketId`: String (PK - Mã phiếu in cho khách)
  - `bookingId`: Int (FK -> `Booking.id`)
  - `roomId`: String (Số phòng đăng ký sử dụng dịch vụ)
  - `serviceId`: String (FK -> `Service.serviceId`)
  - `quantity`: Int (Required, $\ge 1$)
  - `unitPrice`: Decimal
  - `totalPrice`: Decimal ($\text{quantity} \times \text{unitPrice}$)
  - `createdAt`: DateTime
- **`Invoice` (Hóa đơn Check-out):**
  - `invoiceId`: String (PK)
  - `bookingId`: Int (Unique, FK -> `Booking.id`)
  - `totalRoomFee`: Decimal (Đã trừ khuyến mãi)
  - `extraChildrenFee`: Decimal (Tự động tính theo định mức trẻ em vượt chuẩn)
  - `totalServiceFee`: Decimal (Tổng các phiếu dịch vụ của booking)
  - `totalInvoiceAmount`: Decimal ($\text{totalRoomFee} + \text{extraChildrenFee} + \text{totalServiceFee}$)
  - `prepaidBookingValue`: Decimal (Số tiền đã trả trước khi đặt online)
  - `remainingPayable`: Decimal ($\text{totalInvoiceAmount} - \text{prepaidBookingValue}$)
  - `issuedAt`: DateTime

---

## 4. Quy tắc Nghiệp vụ & Công thức Tính toán (Business Rules)

### 4.1. Công thức Kiểm tra Tồn kho Hạng phòng (Room Availability)
Khi khách tìm phòng trống từ `fromDate` đến `toDate` cho một `(type, size)`:
1. `TotalPhysicalRooms` = Tổng số phòng trong bảng `Room` có cùng `(type, size)` và `status != MAINTENANCE`.
2. `BookedRooms` = Tổng `BookingItem.quantity` của các đơn có `status IN ('CONFIRMED', 'CHECKED_IN')` mà khoảng thời gian giao nhau với `[fromDate, toDate)` (tức là `existing.fromDate < search.toDate AND existing.toDate > search.fromDate`).
3. `AvailableQuota` = $\text{TotalPhysicalRooms} - \text{BookedRooms}$.
4. Khách hàng chỉ được phép thêm vào giỏ hàng số lượng phòng $\le \text{AvailableQuota}$.

### 4.2. Quy tắc Khuyến mãi & Thanh toán Giả lập (Promotion & Payment Simulator)
1. **Số đêm lưu trú (`nights`):** $\max(1, \lceil(\text{toDate} - \text{fromDate}) / \text{1 ngày}\rceil)$.
2. **Tiền phòng gốc (`totalRoomFee`):** $\sum (\text{BookingItem.quantity} \times \text{BookingItem.unitPrice} \times \text{nights})$.
3. **Giảm giá khuyến mãi (`discountAmount`):**
   - Kiểm tra `currentDate` nằm trong `[Promotion.startDate, Promotion.endDate]`.
   - Nếu `PERCENTAGE`: $\text{discountAmount} = \text{totalRoomFee} \times (\text{Promotion.value} / 100)$.
   - Nếu `FIXED_AMOUNT`: $\text{discountAmount} = \min(\text{totalRoomFee}, \text{Promotion.value})$.
4. **Tiền phòng sau giảm (`netRoomFee`):** $\text{totalRoomFee} - \text{discountAmount}$.
5. **Số tiền thanh toán lúc đặt (`prepaidBookingValue`):**
   - Nếu khách chọn Thanh toán 100% (`FULL_100`): $\text{prepaidBookingValue} = \text{netRoomFee}$.
   - Nếu khách chọn Đặt cọc 50% (`DEPOSIT_50`): $\text{prepaidBookingValue} = 0.5 \times \text{netRoomFee}$.
6. **Xử lý giao dịch:** Hệ thống kiểm tra bảng `PaymentAccount`. Nếu tồn tại tài khoản và $\text{balance} \ge \text{prepaidBookingValue}$, trừ tiền tài khoản, sinh mã `bookingNumber` và lưu đơn trạng thái `CONFIRMED`.

### 4.3. Quy tắc Hủy Đặt phòng (Cancellation Policy)
- **Điều kiện được phép hủy:** Đơn đặt phòng đang ở trạng thái `CONFIRMED` (chưa Check-in) **VÀ** thời điểm hiện tại cách thời điểm nhận phòng (`fromDate`) **tối thiểu 24 giờ** ($\text{fromDate} - \text{now} \ge 24\text{ hours}$).
- **Xử lý tài chính khi hủy:**
  - $\text{cancellationFee} = 0.20 \times \text{prepaidBookingValue}$ (Khách sạn giữ lại 20%).
  - $\text{refundAmount} = 0.80 \times \text{prepaidBookingValue}$ (Cộng trả lại 80% vào `PaymentAccount.balance` của khách).
  - Chuyển trạng thái đơn sang `CANCELLED`, tự động giải phóng tồn kho phòng.

### 4.4. Quy tắc Gán phòng & Tự động Tính Phụ thu Trẻ em khi Check-in
- Khi khách đến quầy, nhân viên Sale tra cứu theo `bookingNumber`, tên hoặc ngày đặt.
- Nhân viên gán các số phòng vật lý (`roomId` đang `AVAILABLE`) tương ứng với đúng loại phòng và số lượng trong `BookingItem`, đồng thời nhập danh sách khách lưu trú (`StayingGuest`) cho từng phòng.
- **Công thức tự động tính phụ thu trẻ em (`extraChildrenFee`):**
  - Với mỗi phòng vật lý được gán, đếm số khách có `guestType == 'CHILD'` (hoặc $\text{currentYear} - \text{birthYear} < 12$).
  - Nếu $\text{childCount} > \text{Room.maxChildren}$:
    $$\text{excessChildren} = \text{childCount} - \text{Room.maxChildren}$$
    $$\text{roomExtraChildFee} = \text{excessChildren} \times \text{Room.extraChildFee} \times \text{nights}$$
  - Tổng phụ thu trẻ em của đơn đặt phòng bằng tổng `roomExtraChildFee` của tất cả các phòng trong đơn.

### 4.5. Quy tắc Quyết toán Check-out & Công thức Báo cáo Doanh thu
- **Khi Check-out:**
  - $\text{totalInvoiceAmount} = \text{netRoomFee} + \text{extraChildrenFee} + \sum \text{ServiceUsage.totalPrice}$.
  - Số tiền khách phải trả thêm tại quầy: $\text{remainingPayable} = \text{totalInvoiceAmount} - \text{prepaidBookingValue}$.
  - Chuyển trạng thái đơn sang `CHECKED_OUT`, giải phóng các phòng vật lý về `AVAILABLE` và mở giao diện in hóa đơn (`window.print()`).
- **Khi Xem & Xuất Báo cáo Doanh thu (`fromDate` đến `toDate`):**
  - Liệt kê các đơn đặt phòng phát sinh doanh thu thực tế trong kỳ báo cáo (các đơn đã `CHECKED_OUT` có `checkedOutAt` nằm trong kỳ + các đơn đã `CANCELLED` có `cancelledAt` nằm trong kỳ).
  - **Công thức Tổng Doanh Thu (Hiển thị cuối bảng):**
    $$\text{Total Revenue} = \sum_{\text{Checked-out}} \text{Invoice.totalInvoiceAmount} + \sum_{\text{Cancelled}} \text{Booking.cancellationFee}$$