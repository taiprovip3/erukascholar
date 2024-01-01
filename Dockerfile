# Sử dụng một base image có sẵn Docker và Docker Compose
FROM docker:latest

# Sao chép tất cả các tệp từ thư mục hiện tại vào /app của container
COPY . /app

# Thiết lập thư mục làm việc mặc định
WORKDIR /app

# Chạy lệnh docker-compose up khi container được khởi động
CMD ["docker-compose", "up"]