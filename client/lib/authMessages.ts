const AUTH_MESSAGE_MAP: Record<string, string> = {
  "Invalid email or password": "Email hoặc mật khẩu không đúng.",
  "Authentication failed": "Xác thực thất bại.",
  "Please enter a valid email address": "Vui lòng nhập email hợp lệ.",
  "Please provide a valid email": "Vui lòng nhập email hợp lệ.",
  "Email and password are required": "Vui lòng nhập email và mật khẩu.",
  "Email already in use": "Email đã được sử dụng.",
  "Registration successful. Please verify your email.":
    "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
  "Login successful": "Đăng nhập thành công.",
  "Verification token is required": "Thiếu token xác thực.",
  "Verification token is invalid or expired":
    "Token xác thực không hợp lệ hoặc đã hết hạn.",
  "Email verified successfully": "Email đã được xác thực thành công.",
  "If the account exists, a verification email has been sent":
    "Nếu tài khoản tồn tại, email xác thực đã được gửi.",
  "Email already verified": "Email đã được xác thực.",
  "Verification email sent": "Đã gửi email xác thực.",
  "If the account exists, a reset email has been sent":
    "Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.",
  "Password reset email sent": "Đã gửi email đặt lại mật khẩu.",
  "Reset token is required": "Thiếu token đặt lại mật khẩu.",
  "Reset token is invalid or expired":
    "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
  "Password reset successful": "Đặt lại mật khẩu thành công.",
  "Password is required": "Mật khẩu là bắt buộc.",
  "Password must be at least 8 characters": "Mật khẩu phải có ít nhất 8 ký tự.",
  "Password must include an uppercase letter":
    "Mật khẩu phải có ít nhất 1 chữ hoa.",
  "Password must include a lowercase letter":
    "Mật khẩu phải có ít nhất 1 chữ thường.",
  "Password must include a number": "Mật khẩu phải có ít nhất 1 chữ số.",
  "Password must include a special character":
    "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.",
  "Internal server error": "Lỗi hệ thống. Vui lòng thử lại.",
  "Redis is not configured":
    "Hệ thống chưa được cấu hình. Vui lòng thử lại sau.",
  "Current password and new password are required":
    "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.",
};

const mapDuplicateFieldMessage = (message: string) => {
  if (!message.startsWith("Duplicate field value:")) return undefined;
  const field = message.split(":")[1]?.split(".")[0]?.trim();

  if (!field) {
    return "Giá trị đã được sử dụng. Vui lòng dùng giá trị khác.";
  }

  if (field.toLowerCase() === "email") {
    return "Email đã được sử dụng. Vui lòng dùng email khác.";
  }

  return `Giá trị ${field} đã được sử dụng. Vui lòng dùng giá trị khác.`;
};

const mapInvalidFieldMessage = (message: string) => {
  const match = /^Invalid\s+([^:]+):/i.exec(message);
  if (!match) return undefined;

  const field = match[1].trim();
  if (!field) return "Giá trị không hợp lệ.";

  if (field.toLowerCase() === "email") {
    return "Email không hợp lệ.";
  }

  return `Giá trị ${field} không hợp lệ.`;
};

export const toVietnameseAuthMessage = (
  message: string | undefined,
  fallback: string
) => {
  if (!message || !message.trim()) return fallback;
  const normalized = message.trim();

  const mapped = AUTH_MESSAGE_MAP[normalized];
  if (mapped) return mapped;

  const duplicateField = mapDuplicateFieldMessage(normalized);
  if (duplicateField) return duplicateField;

  const invalidField = mapInvalidFieldMessage(normalized);
  if (invalidField) return invalidField;

  return normalized;
};
