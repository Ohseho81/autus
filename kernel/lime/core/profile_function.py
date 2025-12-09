"""Profile Function - Country α and Industry β multipliers"""
from typing import Literal
from .influence_matrix import EntityType, AxisType

CountryCode = Literal["KR", "PH", "US", "JP"]
IndustryCode = Literal["education", "sports", "service", "it", "manufacturing"]

class ProfileFunction:
    def alpha_country(self, country: CountryCode, s: EntityType, t: EntityType, axis: AxisType) -> float:
        if country == "KR":
            if s == "GOV" and t == "HUM": return 1.4
            if s == "EDU" and t == "HUM": return 1.3
            if s == "EMP": return 0.9
            if s == "OPS": return 1.2
        elif country == "PH":
            if s == "OPS": return 1.5
        elif country == "US":
            if s == "EMP": return 1.4
            if s == "CITY": return 1.3
        elif country == "JP":
            if axis in ("TEM", "UNC"): return 1.3
        return 1.0
    
    def beta_industry(self, industry: IndustryCode, s: EntityType, t: EntityType, axis: AxisType) -> float:
        if industry == "education" and s == "EDU" and t == "HUM": return 1.4
        if industry == "sports" and s == "EMP" and axis in ("DIR", "FOR"): return 1.3
        if industry == "service" and s in ("CITY", "EMP"): return 1.2
        if industry == "it" and axis == "INT": return 1.4
        if industry == "manufacturing" and axis == "GAP": return 1.3
        return 1.0
    
    def adjusted_weight(self, base_w: float, country: CountryCode, industry: IndustryCode, 
                        s: EntityType, t: EntityType, axis: AxisType) -> float:
        return base_w * self.alpha_country(country, s, t, axis) * self.beta_industry(industry, s, t, axis)
