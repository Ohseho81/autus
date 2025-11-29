from abc import ABC, abstractmethod

class WorkflowKernel(ABC):
    """DAG/Graph 정의, 실행 엔진, 상태 관리 (추상)"""
    @abstractmethod
    def define_graph(self, spec):
        pass

    @abstractmethod
    def execute(self, graph_id):
        pass

    @abstractmethod
    def get_state(self, graph_id):
        pass
