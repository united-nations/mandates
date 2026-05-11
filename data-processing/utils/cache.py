from joblib.memory import Memory

memory = Memory(location=".cache", verbose=0)
cache = memory.cache
