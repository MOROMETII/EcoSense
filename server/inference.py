# import os
# import json
# import pickle
# import argparse
# import numpy as np
# import pandas as pd

# import torch
# import torch.nn as nn


# ARTIFACTS = "artifacts"
# UNUSUAL_HOURS = set(range(0, 7)) | set(range(22, 24))

# class LSTMClassifier(nn.Module):
#     def __init__(self, input_size, hidden_size, num_layers, num_classes, dropout):
#         super().__init__()
#         self.lstm = nn.LSTM(
#             input_size, hidden_size, num_layers,
#             batch_first=True, dropout=dropout if num_layers > 1 else 0.0
#         )
#         self.head = nn.Sequential(
#             nn.Dropout(dropout),
#             nn.Linear(hidden_size, num_classes)
#         )

#     def forward(self, x):
#         out, _ = self.lstm(x)
#         return self.head(out[:, -1, :])

# _cache = {}

# def _load_artifacts():
#     if _cache:
#         return _cache

#     cfg_path = os.path.join(ARTIFACTS, "model_config.json")
#     scaler_path = os.path.join(ARTIFACTS, "scaler.pkl")
#     weights_path = os.path.join(ARTIFACTS, "model.pt")

#     for p in [cfg_path, scaler_path, weights_path]:
#         if not os.path.exists(p):
#             raise FileNotFoundError(
#                 f"Missing artifact: {p}\n"
#                 "Run `python train.py` first to generate the artifacts."
#             )

#     with open(cfg_path) as f:
#         cfg = json.load(f)

#     with open(scaler_path, "rb") as f:
#         scaler = pickle.load(f)

#     device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
#     model = LSTMClassifier(
#         input_size  = len(cfg["features"]),
#         hidden_size = cfg["hidden_size"],
#         num_layers  = cfg["num_layers"],
#         num_classes = cfg["num_classes"],
#         dropout     = cfg["dropout"],
#     ).to(device)
#     model.load_state_dict(torch.load(weights_path, map_location=device))
#     model.eval()

#     _cache.update({"model": model, "scaler": scaler, "cfg": cfg, "device": device})
#     return _cache


# def generate_insight(
#     socket_id: str,
#     label_id: int,
#     kwh_series: np.ndarray,
#     timestamps=None,
#     windows_open_series=None,
# ) -> str:
#     """
#     Produces a human-readable status string for a socket based on:
#       - The LSTM predicted label (label_id)
#       - Rolling statistics of the socket's kWh series
#       - Whether readings fall in unusual hours
#       - Whether windows are open alongside high consumption

#     Args:
#         socket_id:           e.g. "SKT_01"
#         label_id:            0=Low, 1=Normal, 2=High, 3=Wasteful
#         kwh_series:          full kWh array for this socket (all available rows)
#         timestamps:          optional pd.Series of datetime values (same length)
#         windows_open_series: optional array of windows_open values (same length)

#     Returns:
#         A plain-English insight string.
#     """
#     if len(kwh_series) == 0:
#         return f"{socket_id}: No data available yet."

#     rolling_mean = float(np.mean(kwh_series))
#     rolling_std  = float(np.std(kwh_series))
#     recent_mean  = float(np.mean(kwh_series[-12:]))
#     recent_max   = float(np.max(kwh_series[-12:]))

#     if label_id == 0:
#         if recent_mean < 0.01:
#             return (
#                 f"{socket_id} is drawing virtually no power — "
#                 "it may be idle or in standby mode."
#             )
#         return (
#             f"{socket_id} is functioning at a low, normal rate "
#             f"(avg {recent_mean:.3f} kWh over the last hour)."
#         )

#     if label_id == 1:
#         spike_ratio = recent_mean / rolling_mean if rolling_mean > 0 else 1.0
#         if spike_ratio > 1.5:
#             return (
#                 f"{socket_id} is consuming more power than its usual baseline "
#                 f"({recent_mean:.2f} kWh now vs. {rolling_mean:.2f} kWh average), "
#                 "but still within the normal operating range."
#             )
#         return (
#             f"{socket_id} is operating normally "
#             f"(recent avg {recent_mean:.2f} kWh, overall avg {rolling_mean:.2f} kWh)."
#         )

#     if label_id == 2:
#         if timestamps is not None:
#             recent_hours = pd.to_datetime(timestamps.iloc[-12:]).dt.hour
#             unusual_count = sum(h in UNUSUAL_HOURS for h in recent_hours)
#             if unusual_count >= 6:
#                 return (
#                     f"{socket_id} has been left on during unusual hours and is drawing "
#                     f"high power ({recent_max:.2f} kWh peak). "
#                     "Consider checking whether this device should be active at this time."
#                 )

#         if rolling_std > 0 and (recent_mean - rolling_mean) > 2 * rolling_std:
#             return (
#                 f"{socket_id} is experiencing an unusual power spike "
#                 f"({recent_mean:.2f} kWh vs. baseline {rolling_mean:.2f} kWh). "
#                 "This may indicate a heavy workload or a device fault."
#             )

#         return (
#             f"{socket_id} is using significantly more power than usual "
#             f"({recent_mean:.2f} kWh now vs. {rolling_mean:.2f} kWh average). "
#             "Monitor this socket closely."
#         )

#     if label_id == 3:
#         if windows_open_series is not None and np.any(windows_open_series[-12:] > 0):
#             return (
#                 f"{socket_id} is wasting energy — it is drawing high power "
#                 f"({recent_max:.2f} kWh) while the windows are open. "
#                 "Close the windows or reduce the device load to save energy."
#             )
#         return (
#             f"{socket_id} is in a wasteful state: very high consumption "
#             f"({recent_max:.2f} kWh peak) under conditions that suggest "
#             "energy is being used unnecessarily."
#         )

#     return f"{socket_id}: status unknown."

# def predict_dataframe(df: pd.DataFrame) -> pd.DataFrame:
#     art    = _load_artifacts()
#     model  = art["model"]
#     scaler = art["scaler"]
#     cfg    = art["cfg"]
#     device = art["device"]
#     seq_len     = cfg["seq_len"]
#     features    = cfg["features"]
#     label_names = cfg["label_names"]

#     df = df.copy()
#     df["predicted_label_id"]  = -1
#     df["predicted_label_name"] = "insufficient_data"
#     df["confidence"]  = 0.0
#     df["insight"]   = ""

#     for socket_id, grp in df.groupby("socket_id"):
#         grp = grp.sort_values("timestamp")
#         indices = grp.index.tolist()
#         X_raw   = grp[features].values.astype(np.float32)
#         X_scaled = scaler.transform(X_raw)

#         kwh_series          = grp["kwh"].values
#         timestamps          = grp["timestamp"].reset_index(drop=True) if "timestamp" in grp.columns else None
#         windows_open_series = grp["windows_open"].values if "windows_open" in grp.columns else None

#         seqs, seq_indices = [], []
#         for i in range(seq_len - 1, len(X_scaled)):
#             seqs.append(X_scaled[i - seq_len + 1 : i + 1])
#             seq_indices.append(indices[i])

#         if not seqs:
#             continue

#         X_tensor = torch.tensor(np.array(seqs), dtype=torch.float32).to(device)
#         with torch.no_grad():
#             logits = model(X_tensor)
#             probs  = torch.softmax(logits, dim=1).cpu().numpy()

#         preds = probs.argmax(axis=1)
#         confidence = probs.max(axis=1)

#         for list_pos, (idx, pred, conf) in enumerate(zip(seq_indices, preds, confidence)):
#             row_pos_in_grp = list_pos + seq_len
#             kwh_so_far = kwh_series[:row_pos_in_grp]
#             ts_so_far = timestamps.iloc[:row_pos_in_grp] if timestamps is not None else None
#             win_so_far   = windows_open_series[:row_pos_in_grp] if windows_open_series is not None else None

#             df.at[idx, "predicted_label_id"]   = int(pred)
#             df.at[idx, "predicted_label_name"] = label_names[int(pred)]
#             df.at[idx, "confidence"]            = round(float(conf), 4)
#             df.at[idx, "insight"]               = generate_insight(
#                 socket_id           = socket_id,
#                 label_id            = int(pred),
#                 kwh_series          = kwh_so_far,
#                 timestamps          = ts_so_far,
#                 windows_open_series = win_so_far,
#             )

#     return df


# def predict_single(socket_history: list) -> dict:
#     art    = _load_artifacts()
#     model  = art["model"]
#     scaler = art["scaler"]
#     cfg    = art["cfg"]
#     device = art["device"]
#     seq_len     = cfg["seq_len"]
#     features    = cfg["features"]
#     label_names = cfg["label_names"]

#     if len(socket_history) < seq_len:
#         return {"error": f"Need at least {seq_len} data points, got {len(socket_history)}."}

#     window   = socket_history[-seq_len:]
#     X_raw    = np.array([[row[f] for f in features] for row in window], dtype=np.float32)
#     X_scaled = scaler.transform(X_raw)

#     X_tensor = torch.tensor(X_scaled[np.newaxis], dtype=torch.float32).to(device)
#     with torch.no_grad():
#         logits = model(X_tensor)
#         probs  = torch.softmax(logits, dim=1).cpu().numpy()[0]

#     pred = int(probs.argmax())
#     kwh_series = np.array([row["kwh"] for row in socket_history], dtype=np.float32)

#     timestamps = None
#     if "timestamp" in socket_history[0]:
#         timestamps = pd.Series([row["timestamp"] for row in socket_history])

#     windows_open_series = None
#     if "windows_open" in socket_history[0]:
#         windows_open_series = np.array([row["windows_open"] for row in socket_history])

#     socket_id = socket_history[0].get("socket_id", "Socket")

#     insight = generate_insight(
#         socket_id           = socket_id,
#         label_id            = pred,
#         kwh_series          = kwh_series,
#         timestamps          = timestamps,
#         windows_open_series = windows_open_series,
#     )

#     return {
#         "label_id":   pred,
#         "label_name": label_names[pred],
#         "confidence": round(float(probs[pred]), 4),
#         "insight":    insight,
#         "all_probs":  {label_names[i]: round(float(p), 4) for i, p in enumerate(probs)},
#     }