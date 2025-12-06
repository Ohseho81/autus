FROM node:18-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# 포트
EXPOSE 5173

# 개발 서버 실행 (host 0.0.0.0으로 외부 접근 허용)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


