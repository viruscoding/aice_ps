# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 运行阶段 - 使用 Python
FROM python:3.12-alpine

WORKDIR /app

# 从构建阶段复制构建产物
COPY --from=builder /app/dist .

# 复制templates.json
COPY --from=builder /app/templates.json ./templates.json

# 创建public目录结构，匹配代码中的路径引用
RUN mkdir -p public/images

# 将images从dist复制到public/images（因为代码中引用的是public/images路径）
RUN cp -r images/* public/images/ 2>/dev/null

# 暴露端口
EXPOSE 8080

# 启动 Python HTTP 服务器
CMD ["python", "-m", "http.server", "8080"]