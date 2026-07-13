# Quy tắc phát triển SuViet360

## Quy tắc thiết kế UI/UX
- **Tuyệt đối không dùng Emoji (như 📷, 🎵) làm icon trong code**: Luôn luôn thiết kế và sử dụng các hình ảnh định dạng SVG chất lượng cao, đồng bộ với theme cổ điển/hài hòa của ứng dụng.

## Quy tắc kiểm tra tính đúng đắn logic (Logic Bug Check)
- **Kiểm tra chéo theo checklist của prompt_check_logic_bugs.md**: Trước khi hoàn thành bất kỳ tính năng mới hay cập nhật nào, luôn luôn chạy kiểm tra chéo theo checklist trong file [prompt_check_logic_bugs.md](file:///d:/SU26/WDP301/SuViet360/prompt_check_logic_bugs.md) bao gồm:
  1. **Data Flow**: Kiểm tra đường đi của dữ liệu từ Frontend -> Backend -> DB -> Frontend.
  2. **Status Flow**: Kiểm tra sự chuyển đổi trạng thái khi thực hiện CRUD, lọc và hiển thị.
  3. **Moderation Flow**: Luồng duyệt của giáo viên/admin (Approve/Reject/Draft).
  4. **Authorization**: Phân quyền truy cập ứng với từng vai trò người dùng (student, staff, teacher, admin).
  5. **Cache**: Cơ chế cập nhật và giải phóng Redis cache.
  6. **UI Consistency**: Tính nhất quán trong thông báo, phản hồi và hiển thị biểu diễn dữ liệu.
  7. **Error Handling**: Xử lý lỗi, dọn dẹp file mồ côi (Cloudinary) khi ghi DB lỗi.
