import pytest
from core.runtime_kernel import CoreRuntimeKernel
from core.config_kernel import ConfigKernel
from core.standard_loop_engine import StandardLoopEngine
from core.security_kernel import SecurityKernel
from core.memory_os_kernel import MemoryOSKernel
from core.workflow_kernel import WorkflowKernel
from core.event_bus import EventBus
from core.telemetry_kernel import TelemetryKernel
from core.plugin_loader import PluginLoader
from core.device_bridge_core import DeviceBridgeCore
from core.zero_identity_guard import ZeroIdentityGuard
from core.schema_registry_core import SchemaRegistryCore

import inspect

@pytest.mark.parametrize("cls", [
    CoreRuntimeKernel,
    ConfigKernel,
    StandardLoopEngine,
    SecurityKernel,
    MemoryOSKernel,
    WorkflowKernel,
    EventBus,
    TelemetryKernel,
    PluginLoader,
    DeviceBridgeCore,
    ZeroIdentityGuard,
    SchemaRegistryCore,
])
def test_is_abstract(cls):
    assert inspect.isabstract(cls)
    # All abstract classes should not be instantiable
    with pytest.raises(TypeError):
        cls()
