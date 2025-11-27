from core.armp.enforcer import enforcer

print(f"Total risks: {len(enforcer.risks)}")
for i, risk in enumerate(enforcer.risks):
    print(f"{i+1:2d}: {risk.name} ({type(risk).__name__})")
