#!/usr/bin/env python3
"""
Wrapper script to ensure proper working directory
"""
import os
import sys
import subprocess

# Change to model3 directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Run training
subprocess.run([sys.executable, "train_sac.py"])
