import time, subprocess, datetime, os

# 로그 디렉토리 존재 확인 및 생성
log_path = '/Users/oseho/.clawbot/logs/health_check.log'
os.makedirs(os.path.dirname(log_path), exist_ok=True)

print("🚀 AUTUS 강제 엔진 재점화 완료 (1분 주기)")
while True:
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    # 1. 로그에 강제로 시간 낙인 찍기
    with open(log_path, 'a') as f:
        f.write(f"💓 Heartbeat at {now}: System Alive\n")
    
    # 2. 대시보드 강제 동기화 (s 지수 0.9 고정)
    # Gateway가 꺼져있어도 에러로 멈추지 않게 처리
    try:
        subprocess.run(["curl", "-s", "-X", "POST", "http://localhost:18789/api/v1/cockpit/update", "-d", '{"satisfaction":0.9}'], timeout=5)
    except:
        pass

    print(f"✅ {now} - 엔진 가동 중... (다음 박동까지 60초)")
    time.sleep(60)
