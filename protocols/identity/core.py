import hashlib
from typing import Tuple

class IdentityCore:
    """
    A class used to represent an Identity Core

    Attributes
    ----------
    seed : str
        a string of 32-byte seed
    identity_core : Tuple[int, int, int]
        a tuple representing the 3D identity core

    Methods
    -------
    generate_core()
        Generates the 3D identity core from the seed
    """

    def __init__(self, seed: str):
        """
        Constructs all the necessary attributes for the IdentityCore object.

        Parameters
        ----------
        seed : str
            a string of 32-byte seed. If the seed string is not 32 bytes long, a ValueError will be raised.
        """
        if len(seed) != 32:
            raise ValueError("Seed must be 32 bytes long")
        self.seed = seed
        self.identity_core = self.generate_core()

    def generate_core(self) -> Tuple[int, int, int]:
        """
        Generates the 3D identity core from the seed using SHA256 hash function.

        Returns
        -------
        Tuple[int, int, int]
            a tuple representing the 3D identity core
        """
        hash_object = hashlib.sha256(self.seed.encode())
        hex_dig = hash_object.hexdigest()
        return (int(hex_dig[:8], 16), int(hex_dig[8:16], 16), int(hex_dig[16:24], 16))

if __name__ == "__main__":
    core = IdentityCore("This is a seed string of 32 bytes")
    print(core.identity_core)
