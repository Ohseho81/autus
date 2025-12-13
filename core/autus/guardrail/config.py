from dataclasses import dataclass

@dataclass
class GuardrailConfig:
    pressure_high: float = 0.75
    pressure_critical: float = 0.90
    base_low: float = 0.30
    base_critical: float = 0.15
    auto_release_after: float = 300
    input_clamp_max: float = 0.5

DEFAULT_CONFIG = GuardrailConfig()
