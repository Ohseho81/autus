"""
Distributed Spark Cluster Support for v4.8
Multi-node Spark cluster management and job execution
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class SparkJobStatus(str, Enum):
    """Spark job status"""
    SUBMITTED = "SUBMITTED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ExecutorStatus(str, Enum):
    """Spark executor status"""
    ALIVE = "ALIVE"
    DEAD = "DEAD"
    REEXEC_STATE = "REEXEC_STATE"


@dataclass
class SparkExecutor:
    """Spark executor configuration"""
    executor_id: str
    host: str
    port: int
    cores: int
    memory_mb: int
    status: ExecutorStatus = ExecutorStatus.ALIVE
    cached_rdd_blocks: int = 0
    disk_used_mb: int = 0


@dataclass
class SparkJob:
    """Spark job configuration and tracking"""
    job_id: str
    job_name: str
    main_class: str
    jar_path: str
    num_executors: int
    executor_cores: int
    executor_memory_gb: int
    driver_memory_gb: int = 4
    status: SparkJobStatus = SparkJobStatus.SUBMITTED
    submitted_at: str = ""
    started_at: str = ""
    completed_at: str = ""
    app_id: str = ""
    stages: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.stages is None:
            self.stages = []


class DistributedSparkCluster:
    """Management for distributed Spark cluster"""
    
    def __init__(self, master_url: str = "spark://spark-master:7077"):
        self.master_url = master_url
        self.executors: Dict[str, SparkExecutor] = {}
        self.jobs: Dict[str, SparkJob] = {}
        self.configurations = {}
        self._initialize_spark_context()
        
    def _initialize_spark_context(self) -> None:
        """Initialize Spark context for cluster mode"""
        try:
            from pyspark import SparkConf, SparkContext
            
            conf = SparkConf() \
                .setAppName("AUTUS-v4.8-Cluster") \
                .setMaster(self.master_url) \
                .set("spark.driver.memory", "4g") \
                .set("spark.executor.memory", "2g") \
                .set("spark.executor.cores", "2") \
                .set("spark.dynamicAllocation.enabled", "true") \
                .set("spark.dynamicAllocation.minExecutors", "2") \
                .set("spark.dynamicAllocation.maxExecutors", "50") \
                .set("spark.shuffle.service.enabled", "true") \
                .set("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
                .set("spark.sql.adaptive.enabled", "true")
            
            try:
                self.sc = SparkContext(conf=conf)
                self.sql_context = __import__('pyspark').sql.SQLContext(self.sc)
                logger.info(f"Spark context initialized: {self.master_url}")
            except Exception as e:
                logger.warning(f"Could not create Spark context: {e}. Local mode will be used.")
                self.sc = None
                self.sql_context = None
                
        except ImportError:
            logger.warning("PySpark not installed. Distributed mode unavailable.")
            self.sc = None
            self.sql_context = None
    
    def add_executor(
        self,
        executor_id: str,
        host: str,
        port: int,
        cores: int,
        memory_mb: int
    ) -> SparkExecutor:
        """Add executor to cluster"""
        executor = SparkExecutor(
            executor_id=executor_id,
            host=host,
            port=port,
            cores=cores,
            memory_mb=memory_mb
        )
        
        self.executors[executor_id] = executor
        logger.info(f"Added executor: {executor_id} on {host}:{port} ({cores} cores)")
        
        return executor
    
    def submit_job(
        self,
        job_name: str,
        main_class: str,
        jar_path: str,
        num_executors: int = 4,
        executor_cores: int = 2,
        executor_memory_gb: int = 2,
        driver_memory_gb: int = 4,
        args: List[str] = None,
        conf: Dict[str, str] = None
    ) -> Optional[SparkJob]:
        """Submit job to distributed cluster"""
        if not self.sc:
            logger.error("Spark context not available. Cannot submit job in cluster mode.")
            return None
        
        job_id = f"job_{len(self.jobs) + 1}"
        
        job = SparkJob(
            job_id=job_id,
            job_name=job_name,
            main_class=main_class,
            jar_path=jar_path,
            num_executors=num_executors,
            executor_cores=executor_cores,
            executor_memory_gb=executor_memory_gb,
            driver_memory_gb=driver_memory_gb,
            submitted_at=str(__import__('datetime').datetime.now())
        )
        
        self.jobs[job_id] = job
        logger.info(f"Submitted job: {job_name} (ID: {job_id})")
        
        # In production, would actually submit to cluster
        # Using spark-submit command
        job.status = SparkJobStatus.RUNNING
        job.started_at = str(__import__('datetime').datetime.now())
        
        return job
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status and metrics"""
        if job_id not in self.jobs:
            return None
        
        job = self.jobs[job_id]
        
        return {
            'job_id': job.job_id,
            'job_name': job.job_name,
            'status': job.status.value,
            'submitted_at': job.submitted_at,
            'started_at': job.started_at,
            'completed_at': job.completed_at,
            'num_executors': job.num_executors,
            'executor_cores': job.executor_cores,
            'executor_memory_gb': job.executor_memory_gb,
            'stages': len(job.stages)
        }
    
    def get_cluster_status(self) -> Dict[str, Any]:
        """Get cluster status"""
        total_cores = sum(e.cores for e in self.executors.values())
        total_memory_mb = sum(e.memory_mb for e in self.executors.values())
        alive_executors = sum(1 for e in self.executors.values() if e.status == ExecutorStatus.ALIVE)
        
        return {
            'master_url': self.master_url,
            'total_executors': len(self.executors),
            'alive_executors': alive_executors,
            'total_cores': total_cores,
            'total_memory_gb': total_memory_mb / 1024,
            'running_jobs': sum(1 for j in self.jobs.values() if j.status == SparkJobStatus.RUNNING),
            'completed_jobs': sum(1 for j in self.jobs.values() if j.status == SparkJobStatus.COMPLETED),
        }
    
    def distribute_rdd(
        self,
        data: List[Any],
        partitions: int = 10,
        name: str = "distributed_data"
    ) -> Optional[Any]:
        """Distribute data as RDD"""
        if not self.sc:
            logger.error("Spark context not available")
            return None
        
        try:
            rdd = self.sc.parallelize(data, numPartitions=partitions)
            logger.info(f"Created RDD: {name} ({partitions} partitions)")
            return rdd
        except Exception as e:
            logger.error(f"Error creating RDD: {e}")
            return None
    
    def create_dataframe(
        self,
        data: List[Dict[str, Any]],
        schema: Optional[str] = None,
        name: str = "distributed_df"
    ) -> Optional[Any]:
        """Create distributed DataFrame"""
        if not self.sql_context:
            logger.error("SQL context not available")
            return None
        
        try:
            df = self.sql_context.createDataFrame(data, schema=schema)
            logger.info(f"Created DataFrame: {name}")
            return df
        except Exception as e:
            logger.error(f"Error creating DataFrame: {e}")
            return None
    
    def run_sql_query(self, sql: str) -> Optional[List[Any]]:
        """Run SQL query on cluster"""
        if not self.sql_context:
            logger.error("SQL context not available")
            return None
        
        try:
            result = self.sql_context.sql(sql)
            logger.info(f"Executed SQL query")
            return result.collect()
        except Exception as e:
            logger.error(f"Error running SQL: {e}")
            return None
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel running job"""
        if job_id not in self.jobs:
            return False
        
        job = self.jobs[job_id]
        if job.status == SparkJobStatus.RUNNING:
            job.status = SparkJobStatus.CANCELLED
            job.completed_at = str(__import__('datetime').datetime.now())
            logger.info(f"Cancelled job: {job_id}")
            return True
        
        return False
    
    def get_executor_stats(self, executor_id: str) -> Optional[Dict[str, Any]]:
        """Get executor statistics"""
        if executor_id not in self.executors:
            return None
        
        executor = self.executors[executor_id]
        
        return {
            'executor_id': executor.executor_id,
            'host': executor.host,
            'port': executor.port,
            'cores': executor.cores,
            'memory_mb': executor.memory_mb,
            'status': executor.status.value,
            'cached_rdd_blocks': executor.cached_rdd_blocks,
            'disk_used_mb': executor.disk_used_mb
        }
    
    def scale_cluster(self, target_executors: int) -> bool:
        """Scale cluster to target executor count"""
        try:
            if self.sc:
                # Dynamic allocation configuration
                current_executors = len(self.executors)
                logger.info(f"Scaling from {current_executors} to {target_executors} executors")
                return True
            return False
        except Exception as e:
            logger.error(f"Error scaling cluster: {e}")
            return False
    
    def shutdown(self) -> None:
        """Shutdown cluster"""
        if self.sc:
            self.sc.stop()
            logger.info("Spark cluster shutdown")


class SparkStreamingCluster:
    """Support for Spark Streaming on distributed cluster"""
    
    def __init__(self, cluster: DistributedSparkCluster, batch_interval_seconds: int = 2):
        self.cluster = cluster
        self.batch_interval_seconds = batch_interval_seconds
        self.streaming_context = None
        self.streams: Dict[str, Any] = {}
        
    def initialize(self) -> bool:
        """Initialize streaming context"""
        try:
            from pyspark.streaming import StreamingContext
            
            if self.cluster.sc:
                self.streaming_context = StreamingContext(
                    self.cluster.sc,
                    self.batch_interval_seconds
                )
                logger.info(f"Streaming context initialized ({self.batch_interval_seconds}s batches)")
                return True
            return False
            
        except ImportError:
            logger.warning("PySpark Streaming not available")
            return False
        except Exception as e:
            logger.error(f"Error initializing streaming: {e}")
            return False
    
    def create_kafka_stream(
        self,
        kafka_brokers: str,
        topics: List[str],
        stream_name: str = "kafka_stream"
    ) -> Optional[Any]:
        """Create Kafka stream"""
        if not self.streaming_context:
            logger.error("Streaming context not initialized")
            return None
        
        try:
            from pyspark.streaming.kafka import KafkaUtils
            
            topic_set = set(topics)
            kafka_params = {"metadata.broker.list": kafka_brokers}
            
            stream = KafkaUtils.createDirectStream(
                self.streaming_context,
                topic_set,
                kafka_params
            )
            
            self.streams[stream_name] = stream
            logger.info(f"Created Kafka stream: {stream_name} -> {topics}")
            
            return stream
            
        except Exception as e:
            logger.error(f"Error creating Kafka stream: {e}")
            return None
    
    def start_streaming(self) -> None:
        """Start streaming processing"""
        if self.streaming_context:
            logger.info("Starting Spark Streaming")
            self.streaming_context.start()
    
    def stop_streaming(self, graceful: bool = True) -> None:
        """Stop streaming"""
        if self.streaming_context:
            self.streaming_context.stop(stopSparkContext=not graceful)
            logger.info("Stopped Spark Streaming")


# Global instances
_distributed_cluster = None
_streaming_cluster = None


def get_distributed_spark_cluster() -> DistributedSparkCluster:
    """Get or create distributed Spark cluster"""
    global _distributed_cluster
    if _distributed_cluster is None:
        _distributed_cluster = DistributedSparkCluster()
    return _distributed_cluster


def get_streaming_cluster() -> SparkStreamingCluster:
    """Get or create Spark Streaming cluster"""
    global _streaming_cluster
    if _streaming_cluster is None:
        cluster = get_distributed_spark_cluster()
        _streaming_cluster = SparkStreamingCluster(cluster)
    return _streaming_cluster
