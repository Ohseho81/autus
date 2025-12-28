// ================================================================
// AUTUS RESOURCE MANAGER (BEZOS MODE)
// Zero Friction Policy: Background Low Priority Processing
// WebGPU Acceleration for Local Inference
// ================================================================

// ================================================================
// CONSTANTS
// ================================================================

const RESOURCE_LIMITS = {
    CPU_USAGE_TARGET: 0.1,      // 10% CPU 목표
    MEMORY_LIMIT_MB: 256,       // 최대 256MB
    GPU_PRIORITY: 'low',        // 낮은 GPU 우선순위
    BATCH_SIZE: 32,             // 배치 처리 크기
    IDLE_THRESHOLD_MS: 100,     // 유휴 감지 임계값
    THROTTLE_INTERVAL_MS: 50    // 쓰로틀 간격
};

// ================================================================
// CPU SCHEDULER
// ================================================================

const CPUScheduler = {
    taskQueue: [],
    isProcessing: false,
    lastTaskTime: 0,
    
    /**
     * Schedule a task with low priority
     */
    scheduleTask: function(task, priority = 'low') {
        this.taskQueue.push({
            task,
            priority,
            createdAt: Date.now()
        });
        
        this.processQueue();
    },
    
    /**
     * Process task queue during idle time
     */
    processQueue: async function() {
        if (this.isProcessing || this.taskQueue.length === 0) return;
        
        this.isProcessing = true;
        
        // requestIdleCallback 사용 (브라우저 유휴 시간 활용)
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(
                (deadline) => this.processWithDeadline(deadline),
                { timeout: 5000 }
            );
        } else {
            // Fallback: setTimeout with delay
            setTimeout(() => this.processBatch(), RESOURCE_LIMITS.THROTTLE_INTERVAL_MS);
        }
    },
    
    /**
     * Process tasks within idle deadline
     */
    processWithDeadline: async function(deadline) {
        while (deadline.timeRemaining() > 0 && this.taskQueue.length > 0) {
            const item = this.taskQueue.shift();
            
            try {
                await item.task();
            } catch (err) {
                console.error('[CPUScheduler] Task error:', err);
            }
            
            this.lastTaskTime = Date.now();
        }
        
        this.isProcessing = false;
        
        // 남은 태스크가 있으면 다음 유휴 시간에 처리
        if (this.taskQueue.length > 0) {
            this.processQueue();
        }
    },
    
    /**
     * Fallback batch processing
     */
    processBatch: async function() {
        const batch = this.taskQueue.splice(0, RESOURCE_LIMITS.BATCH_SIZE);
        
        for (const item of batch) {
            try {
                await item.task();
            } catch (err) {
                console.error('[CPUScheduler] Task error:', err);
            }
            
            // CPU 양보
            await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        this.isProcessing = false;
        
        if (this.taskQueue.length > 0) {
            setTimeout(() => this.processQueue(), RESOURCE_LIMITS.THROTTLE_INTERVAL_MS);
        }
    },
    
    /**
     * Get queue status
     */
    getStatus: function() {
        return {
            queueLength: this.taskQueue.length,
            isProcessing: this.isProcessing,
            lastTaskTime: this.lastTaskTime
        };
    },
    
    /**
     * Clear all pending tasks
     */
    clear: function() {
        this.taskQueue = [];
        this.isProcessing = false;
    }
};

// ================================================================
// MEMORY MANAGER
// ================================================================

const MemoryManager = {
    allocations: new Map(),
    totalAllocated: 0,
    
    /**
     * Allocate memory with tracking
     */
    allocate: function(id, sizeBytes) {
        // 한도 확인
        const sizeMB = sizeBytes / (1024 * 1024);
        if (this.totalAllocated + sizeMB > RESOURCE_LIMITS.MEMORY_LIMIT_MB) {
            this.cleanup();
            
            if (this.totalAllocated + sizeMB > RESOURCE_LIMITS.MEMORY_LIMIT_MB) {
                console.warn('[MemoryManager] Memory limit reached');
                return false;
            }
        }
        
        this.allocations.set(id, {
            size: sizeMB,
            allocatedAt: Date.now()
        });
        
        this.totalAllocated += sizeMB;
        return true;
    },
    
    /**
     * Release allocated memory
     */
    release: function(id) {
        const allocation = this.allocations.get(id);
        if (allocation) {
            this.totalAllocated -= allocation.size;
            this.allocations.delete(id);
        }
    },
    
    /**
     * Cleanup old allocations
     */
    cleanup: function() {
        const now = Date.now();
        const maxAge = 60000; // 1분
        
        this.allocations.forEach((allocation, id) => {
            if (now - allocation.allocatedAt > maxAge) {
                this.release(id);
            }
        });
    },
    
    /**
     * Get memory status
     */
    getStatus: function() {
        let usedMB = this.totalAllocated;
        
        // 실제 메모리 사용량 (가능한 경우)
        if (performance.memory) {
            usedMB = performance.memory.usedJSHeapSize / (1024 * 1024);
        }
        
        return {
            allocatedMB: this.totalAllocated,
            limitMB: RESOURCE_LIMITS.MEMORY_LIMIT_MB,
            usagePercent: (this.totalAllocated / RESOURCE_LIMITS.MEMORY_LIMIT_MB) * 100,
            allocationCount: this.allocations.size,
            jsHeapMB: usedMB
        };
    },
    
    /**
     * Force garbage collection hint
     */
    requestGC: function() {
        // 큰 객체 해제를 위한 힌트
        this.cleanup();
        
        // 모든 할당 해제
        this.allocations.clear();
        this.totalAllocated = 0;
    }
};

// ================================================================
// WEBGPU ACCELERATOR
// ================================================================

const WebGPUAccelerator = {
    device: null,
    adapter: null,
    isAvailable: false,
    
    /**
     * Initialize WebGPU
     */
    async init() {
        if (!navigator.gpu) {
            console.log('[WebGPU] Not available, using CPU fallback');
            this.isAvailable = false;
            return false;
        }
        
        try {
            this.adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'low-power' // 저전력 모드
            });
            
            if (!this.adapter) {
                console.log('[WebGPU] No adapter found');
                this.isAvailable = false;
                return false;
            }
            
            this.device = await this.adapter.requestDevice({
                // 최소 리소스만 요청
                requiredLimits: {
                    maxBindGroups: 4,
                    maxBufferSize: 256 * 1024 * 1024 // 256MB
                }
            });
            
            this.isAvailable = true;
            console.log('[WebGPU] Initialized with low-power mode');
            
            return true;
        } catch (err) {
            console.error('[WebGPU] Initialization failed:', err);
            this.isAvailable = false;
            return false;
        }
    },
    
    /**
     * Run compute shader
     */
    async compute(shaderCode, inputData) {
        if (!this.isAvailable) {
            return this.cpuFallback(inputData);
        }
        
        // WebGPU 계산 로직 (시뮬레이션)
        return new Promise(resolve => {
            CPUScheduler.scheduleTask(async () => {
                // 실제로는 GPU 셰이더 실행
                resolve({
                    success: true,
                    result: inputData, // 처리된 결과
                    usedGPU: true
                });
            });
        });
    },
    
    /**
     * CPU fallback for when WebGPU is unavailable
     */
    cpuFallback(inputData) {
        return {
            success: true,
            result: inputData,
            usedGPU: false
        };
    },
    
    /**
     * Whisper inference (Speech-to-Text)
     */
    async whisperInference(audioData) {
        console.log('[WebGPU] Running Whisper inference...');
        
        return new Promise(resolve => {
            CPUScheduler.scheduleTask(async () => {
                // 실제로는 Whisper 모델 실행
                // WebGPU가 있으면 GPU 가속
                
                resolve({
                    text: '[TRANSCRIBED_TEXT]',
                    language: 'ko',
                    confidence: 0.95,
                    usedGPU: this.isAvailable
                });
            });
        });
    },
    
    /**
     * Tesseract inference (OCR)
     */
    async tesseractInference(imageData) {
        console.log('[WebGPU] Running Tesseract inference...');
        
        return new Promise(resolve => {
            CPUScheduler.scheduleTask(async () => {
                // 실제로는 Tesseract 모델 실행
                
                resolve({
                    text: '[OCR_TEXT]',
                    confidence: 0.92,
                    boxes: [],
                    usedGPU: this.isAvailable
                });
            });
        });
    },
    
    /**
     * Get GPU status
     */
    getStatus() {
        return {
            available: this.isAvailable,
            adapterInfo: this.adapter?.name || 'N/A',
            powerPreference: 'low-power'
        };
    }
};

// ================================================================
// PERFORMANCE MONITOR
// ================================================================

const PerformanceMonitor = {
    metrics: [],
    isMonitoring: false,
    monitorInterval: null,
    
    /**
     * Start monitoring
     */
    start(intervalMs = 1000) {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitorInterval = setInterval(() => {
            this.collectMetrics();
        }, intervalMs);
        
        console.log('[PerformanceMonitor] Started');
    },
    
    /**
     * Stop monitoring
     */
    stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isMonitoring = false;
        console.log('[PerformanceMonitor] Stopped');
    },
    
    /**
     * Collect current metrics
     */
    collectMetrics() {
        const metric = {
            timestamp: Date.now(),
            cpu: this.estimateCPU(),
            memory: MemoryManager.getStatus(),
            gpu: WebGPUAccelerator.getStatus(),
            tasks: CPUScheduler.getStatus()
        };
        
        this.metrics.push(metric);
        
        // 최근 100개만 유지
        if (this.metrics.length > 100) {
            this.metrics = this.metrics.slice(-100);
        }
        
        // 임계값 초과 시 경고
        this.checkThresholds(metric);
    },
    
    /**
     * Estimate CPU usage
     */
    estimateCPU() {
        // 실제 CPU 사용량은 측정하기 어려움
        // 태스크 큐 길이와 처리 시간으로 추정
        const queueLength = CPUScheduler.taskQueue.length;
        const estimated = Math.min(queueLength / 100, 1); // 0-1 범위
        
        return {
            estimated,
            target: RESOURCE_LIMITS.CPU_USAGE_TARGET,
            withinTarget: estimated <= RESOURCE_LIMITS.CPU_USAGE_TARGET
        };
    },
    
    /**
     * Check resource thresholds
     */
    checkThresholds(metric) {
        // CPU 초과
        if (metric.cpu.estimated > RESOURCE_LIMITS.CPU_USAGE_TARGET * 2) {
            console.warn('[PerformanceMonitor] CPU usage high, throttling...');
            this.throttle();
        }
        
        // 메모리 초과
        if (metric.memory.usagePercent > 90) {
            console.warn('[PerformanceMonitor] Memory usage high, cleaning up...');
            MemoryManager.cleanup();
        }
    },
    
    /**
     * Throttle processing
     */
    throttle() {
        // 태스크 처리 일시 중지
        CPUScheduler.isProcessing = false;
        
        setTimeout(() => {
            CPUScheduler.processQueue();
        }, RESOURCE_LIMITS.THROTTLE_INTERVAL_MS * 2);
    },
    
    /**
     * Get performance summary
     */
    getSummary() {
        if (this.metrics.length === 0) return null;
        
        const recent = this.metrics.slice(-10);
        
        return {
            avgCPU: recent.reduce((s, m) => s + m.cpu.estimated, 0) / recent.length,
            avgMemory: recent.reduce((s, m) => s + m.memory.usagePercent, 0) / recent.length,
            peakMemory: Math.max(...recent.map(m => m.memory.allocatedMB)),
            gpuAvailable: recent[recent.length - 1]?.gpu?.available,
            metricsCount: this.metrics.length
        };
    }
};

// ================================================================
// RESOURCE MANAGER (Unified Interface)
// ================================================================

export const ResourceManager = {
    scheduler: CPUScheduler,
    memory: MemoryManager,
    gpu: WebGPUAccelerator,
    monitor: PerformanceMonitor,
    limits: RESOURCE_LIMITS,
    
    isInitialized: false,
    
    /**
     * Initialize Resource Manager
     */
    async init(config = {}) {
        console.log('[ResourceManager] Initializing Bezos Mode...');
        
        // 커스텀 리밋 적용
        if (config.limits) {
            Object.assign(RESOURCE_LIMITS, config.limits);
        }
        
        // WebGPU 초기화
        await this.gpu.init();
        
        // 모니터링 시작
        this.monitor.start();
        
        this.isInitialized = true;
        console.log('[ResourceManager] Initialized - Zero Friction Mode Active');
        
        return this;
    },
    
    /**
     * Schedule a task with resource management
     */
    scheduleTask(task, options = {}) {
        const { priority = 'low', memoryHint = 0 } = options;
        
        // 메모리 사전 할당
        if (memoryHint > 0) {
            const allocated = this.memory.allocate(
                `task_${Date.now()}`, 
                memoryHint
            );
            
            if (!allocated) {
                console.warn('[ResourceManager] Memory allocation failed');
            }
        }
        
        this.scheduler.scheduleTask(task, priority);
    },
    
    /**
     * Run GPU-accelerated inference
     */
    async runInference(type, data) {
        switch (type) {
            case 'whisper':
                return this.gpu.whisperInference(data);
            case 'tesseract':
                return this.gpu.tesseractInference(data);
            default:
                return this.gpu.compute(null, data);
        }
    },
    
    /**
     * Get overall status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            scheduler: this.scheduler.getStatus(),
            memory: this.memory.getStatus(),
            gpu: this.gpu.getStatus(),
            performance: this.monitor.getSummary(),
            limits: this.limits
        };
    },
    
    /**
     * Request resource cleanup
     */
    cleanup() {
        this.memory.cleanup();
        this.scheduler.clear();
    },
    
    /**
     * Shutdown resource manager
     */
    shutdown() {
        this.monitor.stop();
        this.cleanup();
        this.isInitialized = false;
        console.log('[ResourceManager] Shutdown complete');
    }
};

export { CPUScheduler, MemoryManager, WebGPUAccelerator, PerformanceMonitor, RESOURCE_LIMITS };

export default ResourceManager;




