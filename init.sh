#!/usr/bin/env bash
set -e

echo "===================================================="
echo "🚀 e-Hotel Harness Environment Initialization"
echo "===================================================="

# 1. Kiểm tra môi trường thực thi (Node.js & Docker)
if command -v node &> /dev/null; then
  echo "✅ Node.js version: $(node --version)"
else
  echo "⚠️ Node.js chưa được cài trên PATH máy host."
  echo "   (Khuyến nghị: Cài đặt Node.js v20+ hoặc v24+)"
fi

if command -v npm &> /dev/null; then
  echo "✅ npm version: $(npm --version)"
else
  echo "⚠️ npm chưa được phát hiện trên PATH."
fi

if command -v docker &> /dev/null; then
  echo "✅ Docker version: $(docker --version)"
else
  echo "⚠️ Docker chưa được phát hiện trên PATH."
fi

# 2. Kiểm tra mã nguồn Backend Node.js / Prisma nếu đã tồn tại
if [ -d "backend" ]; then
  echo "🔍 Phát hiện thư mục backend. Đang kiểm tra mã nguồn..."
  if [ -d "backend/tests" ]; then
    echo "🧪 Chạy unit tests: npm test"
    (cd backend && npm test || true)
  fi
else
  echo "ℹ️ Chưa có thư mục backend. Hãy bắt đầu xây dựng tại FEAT-01 (Node.js + Prisma ORM)."
fi

# 3. Hiển thị tiến độ từ feature_list.json
if [ -f "feature_list.json" ]; then
  echo "----------------------------------------------------"
  echo "📋 Trạng thái Feature List hiện tại:"
  if command -v node &> /dev/null; then
    node -e '
      const fs = require("fs");
      const data = JSON.parse(fs.readFileSync("feature_list.json", "utf8"));
      const passed = data.features.filter(f => f.status === "done" || f.status === "passed").length;
      console.log(`Tiến độ: ${passed}/${data.features.length} tính năng hoàn thành.\n`);
      data.features.forEach(f => {
        const isDone = f.status === "done" || f.status === "passed";
        const icon = isDone ? "✅" : (f.status === "in-progress" ? "🔄" : "⏳");
        const featName = f.name || f.title || "";
        console.log(`${icon} [${f.id}] (${f.status.toUpperCase()}) - ${featName}`);
      });
    '
  else
    echo "⚠️ Không tìm thấy Node để parse feature_list.json"
  fi
  echo "----------------------------------------------------"
fi

echo ""
echo "Next steps:"
echo "1. Đọc AGENTS.md, docs/SPEC.md, docs/adr/ADR-001-tech-stack-decision.md và ARCHITECHTURE.md"
echo "2. Đọc feature_list.json và progress.md để xác định tính năng tiếp theo"
echo "3. Chọn duy nhất 1 tính năng (One feature at a time)"
echo "4. Thực thi code và xác minh bằng bộ lệnh kiểm tra (npm run lint, npm test, npx prisma db push) trước khi kết thúc"
echo "5. Cập nhật session-handoff.md và progress.md để đảm bảo hệ thống clean và restartable."