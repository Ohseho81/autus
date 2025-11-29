"""
Minimal plugins package for tests.

The real plugin loading is handled by `plugins.loader`, this package
exists so that `import plugins` in tests succeeds without changing
the overall architecture.
"""


