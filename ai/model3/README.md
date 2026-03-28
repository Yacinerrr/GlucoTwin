# Model 3: SAC (Soft Actor-Critic) for Insulin Dosing

## Overview

This is **Model 3** using **SAC (Soft Actor-Critic)** algorithm instead of PPO. SAC is better suited for continuous control tasks like insulin dosing:

- **Faster convergence** (~4 hours vs PPO's 12-14 hours)
- **Built-in entropy regularization** prevents policy collapse
- **Better continuous action handling** via Gaussian policy
- **More stable training** with automatic entropy tuning

## File Structure

```
model3/
├── requirements.txt          # Python dependencies
├── glucose_env.py            # T1D Simulation environment
├── train_sac.py              # SAC training script
├── test_sac_model.py         # Model testing/validation
├── models_sac/               # Trained models directory
│   ├── checkpoints/          # Training checkpoints
│   ├── best/                 # Best model during training
│   ├── sac_final.zip         # Final trained model
│   └── final_vecnormalize.pkl # Environment normalizer
├── logs_sac/                 # TensorBoard logs
└── README.md                 # This file
```

## Setup

### 1. Install dependencies

```bash
cd d:\GITHUB-REPOS\GlucoTwin\ai\model3

# Activate venv (Windows)
..\..\\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

### 2. Train SAC Model

```bash
python train_sac.py
```

**Training Time:** ~4 hours on CPU
**Timesteps:** 500,000

### 3. Monitor Training

```bash
# In another terminal
tensorboard --logdir logs_sac/
# Open http://localhost:6006
```

### 4. Test Trained Model

```bash
python test_sac_model.py --model models_sac/sac_final.zip --episodes 10
```

## Configuration

### SAC Hyperparameters (in `train_sac.py`)

```python
learning_rate = 3e-4         # Higher than PPO for faster learning
batch_size = 256             # Batch size for training
buffer_size = 1,000,000      # Replay buffer capacity
gamma = 0.99                 # Discount factor
tau = 0.005                  # Soft update coefficient
ent_coef = "auto"            # Automatic entropy regularization
use_sde = True               # Stochastic dynamics for exploration
```

### Environment Features

**Observation Space (18-dim):**

- BG history [0:12]: Last 12 measurements (normalized by 400)
- Current BG [12]: Current blood glucose (normalized by 400)
- Last dose [13]: Previous insulin dose (normalized by 15)
- Meal carbs [14]: Current meal carbs (normalized by 100)
- Hour encoding [15:17]: sin/cos of hour (cyclic)
- Bolus timing [17]: Time since last bolus (normalized by 288)

**Action Space:**

- Insulin dose: continuous [0.0, 15.0] U

**Medical Parameters:**

- ISF (Insulin Sensitivity Factor): 50 mg/dL per U
- ICR (Insulin Carb Ratio): 10 g per U
- Target BG: 100 mg/dL
- TIR range: 70-180 mg/dL
- Safety: Blocks dosing if BG < 90

## Key Advantages Over PPO (Model 2)

| Feature                | PPO               | SAC                       |
| ---------------------- | ----------------- | ------------------------- |
| Algorithm              | Policy Gradient   | Actor-Critic (Off-policy) |
| Training Speed         | 12-14 hours       | ~4 hours                  |
| Entropy Regularization | Coefficient fixed | Automatic tuning          |
| Continuous Actions     | Beta policy       | Gaussian policy           |
| Sample Efficiency      | Lower             | Higher (replay buffer)    |
| Exploration            | Fixed ε           | Automatic entropy         |
| Policy Collapse Risk   | Higher            | Lower                     |

## Results & Metrics

### Training Metrics (TensorBoard)

- `rollout/ep_rew_mean`: Episode reward
- `train/actor_loss`: Actor network loss
- `train/critic_loss`: Critic network loss
- `train/entropy_loss`: Entropy regularization
- `train/learning_rate`: Adaptive learning rate

### Evaluation Metrics

- **Mean BG:** Target 100-150 mg/dL
- **Time in Range (TIR):** Target > 70%
- **Hypoglycemia Rate:** Target < 5%
- **Hyperglycemia Rate:** Target < 20%
- **Mean Insulin Dose:** Realistic 0.5-2.0 U/3h

## Troubleshooting

### Slow Training

- Increase `num_envs` in `TrainingConfig` (if hardware allows)
- Reduce `buffer_size` if memory-constrained
- Check GPU availability: `nvidia-smi`

### Model Not Learning

- Check TensorBoard logs: `tensorboard --logdir logs_sac/`
- Verify environment metrics in `test_sac_model.py`
- Ensure reward function is reasonable (check `glucose_env.py`)

### Memory Issues

- Reduce `num_envs` from 4 to 2 or 1
- Reduce `buffer_size` from 1M to 500k
- Use `--device cpu` to force CPU training

## Next Steps

1. **Complete training** (~4 hours)
2. **Test model** with diverse scenarios
3. **Evaluate metrics** and compare with baseline
4. **Deploy to app.py** for real-time dosing
5. **Monitor performance** in production

## References

- Stable-Baselines3 SAC: https://stable-baselines3.readthedocs.io/en/master/modules/sac.html
- Original SAC Paper: https://arxiv.org/abs/1801.01290
- Gymnasium Docs: https://gymnasium.farama.org/

---

**Status:** Ready for training  
**Last Updated:** 2026-03-27  
**Author:** GlucoTwin Development Team
