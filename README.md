# AI Dashboard Report 📊

Hệ thống Báo cáo Thông minh, hỗ trợ xử lý số liệu Doanh thu (Sapo) và Chi phí Quảng cáo (Facebook) bằng trình thông dịch AI (Google Gemini) trên nền tảng Website kết nối với kho lưu trữ đám mây Google Sheets.

## Tính năng nổi bật
* **Đọc hiểu Dữ liệu Phức tạp:** Chấp nhận đầu vào từ file CSV, Excel và hình ảnh để nhận diện số liệu.
* **Cơ chế kéo thả (Drag & Drop):** Upload file gọn gàng, có hệ thống đọc số chuyên biệt loại bỏ lỗi chuỗi ký tự. 
* **Quản trị phân quyền (Role-based Access):** Quản lý qua Backend (Google Apps Script), phân định Nhân viên và Ban giám đốc bằng token.
* **Bảo mật và Tối ưu:** Code được chia nhỏ gọn gàng, loại bỏ kiểm tra Mật khẩu phía Trình duyệt và giảm tải lệnh điều kiện thông qua Dictionary Mapping.

## Hướng dẫn cài đặt

Dự án này là giao diện Font-end (Website). Để làm nó sống động và lưu trữ được Dữ liệu lên Cloud, bạn cần có 1 Web-App Backend là Google Apps Script kết nối với một file Google Sheets.

1. **Chuẩn bị Backend:** Cài đặt mã Script (Apps Script) trên tài khoản Google của bạn.
2. Sao chép link xuất bản của Apps Script (dạng `https://script.google.com/...`) và dán vào biến `SCRIPT_URL` tại dòng đầu tiên của file `script.js`.
3. Bật Hosting cho Web này thông qua **GitHub Pages** hoặc mở trực tiếp file `index.html` trong chế độ Local để sử dụng ngay.

## Yêu cầu đối với thiết lập Apps Script (Role)
Tại hàm xác thực đăng nhập, Backend buộc phải trả về object có chứa trường `role` để frontend có thể cấp quyền hiển thị chức năng:
```json
{
  "valid": true,
  "name": "Tên người sử dụng",
  "role": "admin" // Hoặc "staff"
}
```

*Được thiết kế dựa trên các tiêu chuẩn hiện đại bởi AI Assistant.*
