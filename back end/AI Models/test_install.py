"""
GlucoTwin M3 — Script de vérification d'installation (v2 — corrigé)
====================================================================
Lancez ce fichier APRÈS avoir installé les packages :
    pip install -r requirements.txt

Corrections v2 :
    - Bug 1 : observation_space bornes correctes pour sin/cos (-1 à +1)
    - Bug 2 : info retourné comme {} et non objet SimGlucose
    - Bug 3 : super().reset(seed=seed) appelé dans reset()

Usage :
    python test_install.py
"""

OK   = '\033[92m[OK]\033[0m'
FAIL = '\033[91m[FAIL]\033[0m'
INFO = '\033[94m[...]\033[0m'


def check(label, fn):
    print(f"  {INFO} {label} ...", end=' ', flush=True)
    try:
        result = fn()
        print(f"\r  {OK}  {label}" + (f" — {result}" if result else ""))
        return True
    except Exception as e:
        print(f"\r  {FAIL} {label}")
        print(f"       → {e}")
        return False


print("\n╔══════════════════════════════════════════╗")
print("║   GlucoTwin M3 — Vérification install    ║")
print("╚══════════════════════════════════════════╝\n")

# ─── TEST 1 — Imports de base ────────────────────────────────
print("① Imports essentiels")
results = []

results.append(check("numpy",      lambda: __import__('numpy').__version__))
results.append(check("torch",      lambda: __import__('torch').__version__))
results.append(check("pandas",     lambda: __import__('pandas').__version__))
results.append(check("matplotlib", lambda: __import__('matplotlib').__version__))


# ─── TEST 2 — SimGlucose ─────────────────────────────────────
print("\n② SimGlucose — simulateur physiologique T1DM")

def test_simglucose_import():
    from simglucose.patient.t1dpatient import T1DPatient
    from simglucose.simulation.env import T1DSimEnv
    from simglucose.sensor.cgm import CGMSensor
    from simglucose.actuator.pump import InsulinPump
    from simglucose.controller.base import Action
    return "imports OK"

def test_simglucose_patients():
    from simglucose.patient.t1dpatient import T1DPatient
    p = T1DPatient.withName('adolescent#001')
    return f"patient chargé : {p.name}"

def test_simglucose_simulation():
    from simglucose.patient.t1dpatient import T1DPatient
    from simglucose.sensor.cgm import CGMSensor
    from simglucose.actuator.pump import InsulinPump
    from simglucose.simulation.env import T1DSimEnv
    from simglucose.simulation.scenario import CustomScenario
    from simglucose.controller.base import Action
    from datetime import datetime

    patient  = T1DPatient.withName('adolescent#001')
    sensor   = CGMSensor.withName('Dexcom', seed=0)
    pump     = InsulinPump.withName('Insulet')
    scenario = CustomScenario(
        start_time=datetime(2024, 1, 1, 0, 0, 0),
        scenario=[(0.0, 0.0)]
    )
    env = T1DSimEnv(patient, sensor, pump, scenario)
    obs, _, _, _ = env.step(Action(basal=0.02, bolus=0))
    bg = obs.CGM
    assert 30 < bg < 500, f"Glycémie hors plage : {bg}"
    return f"glycémie = {bg:.1f} mg/dL"

results.append(check("simglucose import",     test_simglucose_import))
results.append(check("simglucose patients",   test_simglucose_patients))
results.append(check("simglucose simulation", test_simglucose_simulation))


# ─── TEST 3 — Gymnasium ──────────────────────────────────────
print("\n③ Gymnasium — interface environnement RL")

def test_gymnasium():
    import gymnasium as gym
    return gym.__version__

def test_gym_spaces():
    import gymnasium as gym
    import numpy as np
    low  = np.array([0.0, -1.0, -1.0], dtype=np.float32)
    high = np.array([1.0,  1.0,  1.0], dtype=np.float32)
    obs_space = gym.spaces.Box(low=low, high=high, dtype=np.float32)
    act_space = gym.spaces.Box(low=0.0, high=15.0, shape=(1,), dtype=np.float32)
    assert obs_space.sample().shape == (3,)
    assert 0.0 <= float(act_space.sample()[0]) <= 15.0
    return "Box spaces OK"

results.append(check("gymnasium import",  test_gymnasium))
results.append(check("gymnasium spaces",  test_gym_spaces))


# ─── TEST 4 — Stable-Baselines3 ─────────────────────────────
print("\n④ Stable-Baselines3 — algorithme PPO")

def test_sb3():
    import stable_baselines3 as sb3
    return sb3.__version__

def test_ppo_import():
    from stable_baselines3 import PPO
    from stable_baselines3.common.env_checker import check_env
    from stable_baselines3.common.callbacks import EvalCallback
    return "PPO + callbacks importés"

def test_ppo_cartpole():
    import gymnasium as gym
    from stable_baselines3 import PPO
    import warnings
    warnings.filterwarnings('ignore')
    env   = gym.make('CartPole-v1')
    model = PPO('MlpPolicy', env, verbose=0)
    model.learn(total_timesteps=1000)
    obs, _ = env.reset()
    action, _ = model.predict(obs, deterministic=True)
    env.close()
    return f"CartPole OK — action={int(action)}"

results.append(check("stable-baselines3 import",  test_sb3))
results.append(check("PPO + callbacks",            test_ppo_import))
results.append(check("PPO CartPole (1k steps)",    test_ppo_cartpole))


# ─── TEST 5 — Intégration GlucoseEnv minimale ───────────────
print("\n⑤ Test d'intégration — GlucoseEnv minimal")

def test_glucose_env_minimal():
    import gymnasium as gym
    import numpy as np
    from simglucose.patient.t1dpatient import T1DPatient
    from simglucose.sensor.cgm import CGMSensor
    from simglucose.actuator.pump import InsulinPump
    from simglucose.simulation.env import T1DSimEnv
    from simglucose.simulation.scenario import CustomScenario
    from simglucose.controller.base import Action
    from datetime import datetime

    class MiniGlucoseEnv(gym.Env):

        def __init__(self):
            super().__init__()
            # FIX 1 : sin/cos ∈ [-1,+1] — bornes explicites par feature
            low  = np.array([0.0, -1.0, -1.0], dtype=np.float32)
            high = np.array([1.0,  1.0,  1.0], dtype=np.float32)
            self.observation_space = gym.spaces.Box(low=low, high=high, dtype=np.float32)
            self.action_space      = gym.spaces.Box(low=0.0, high=15.0, shape=(1,), dtype=np.float32)
            self.t  = 0
            self.bg = 120.0

        def _make_sim(self):
            patient  = T1DPatient.withName('adolescent#001')
            sensor   = CGMSensor.withName('Dexcom', seed=self.t)
            pump     = InsulinPump.withName('Insulet')
            scenario = CustomScenario(
                start_time=datetime(2024, 1, 1, 0, 0, 0),
                scenario=[(0.0, 0.0)]
            )
            return T1DSimEnv(patient, sensor, pump, scenario)

        def reset(self, seed=None, options=None):
            # FIX 2 : super().reset() obligatoire pour Gymnasium
            super().reset(seed=seed)
            self.sim = self._make_sim()
            obs, _, _, _ = self.sim.step(Action(basal=0.02, bolus=0))
            self.bg = float(obs.CGM)
            self.t  = 0
            return self._get_obs(), {}

        def _get_obs(self):
            hour = (self.t * 5 / 60) % 24
            return np.array([
                float(np.clip(self.bg / 400.0, 0.0, 1.0)),
                float(np.sin(2 * np.pi * hour / 24)),
                float(np.cos(2 * np.pi * hour / 24)),
            ], dtype=np.float32)

        def _reward(self, bg):
            if 70 <= bg <= 180:  return  1.0
            elif bg < 54:        return -20.0
            elif bg < 70:        return -10.0
            elif bg > 250:       return  -5.0
            else:                return  -2.0

        def step(self, action):
            dose = float(np.clip(action[0], 0.0, 15.0))
            if self.bg < 90:
                dose = 0.0   # Guardian Layer
            obs, _, done, _ = self.sim.step(Action(basal=dose / 12.0, bolus=0))
            self.bg = float(obs.CGM)
            self.t += 1
            # FIX 3 : info = {} et non l'objet SimGlucose
            return self._get_obs(), float(self._reward(self.bg)), bool(done), False, {}

    from stable_baselines3.common.env_checker import check_env
    import warnings
    warnings.filterwarnings('ignore')

    env = MiniGlucoseEnv()
    check_env(env, warn=True)

    obs, _ = env.reset()
    bgs = []
    for _ in range(10):
        obs, reward, done, _, _ = env.step(env.action_space.sample())
        bgs.append(env.bg)
        if done:
            obs, _ = env.reset()

    avg_bg  = float(np.mean(bgs))
    n_hypos = sum(1 for b in bgs if b < 70)
    return f"check_env OK | BG moy={avg_bg:.0f} | hypos={n_hypos}"

results.append(check("GlucoseEnv minimal + check_env", test_glucose_env_minimal))


# ─── BILAN ───────────────────────────────────────────────────
n_ok   = sum(results)
n_fail = len(results) - n_ok

print("\n" + "─" * 44)
if n_fail == 0:
    print(f"  {OK}  Tout fonctionne ({n_ok}/{len(results)} tests réussis)")
    print("       Prochaine étape : glucose_env.py\n")
else:
    print(f"  {FAIL} {n_fail} test(s) échoué(s) sur {len(results)}")
    print("       Relancez : pip install -r requirements.txt\n")
    print("  Diagnostic :")
    print("    pip show simglucose stable-baselines3 gymnasium")
    print("    python -c \"import simglucose; print('OK')\"")
print()