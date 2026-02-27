import os
from typing import Dict, Any, Tuple, List
from datetime import datetime
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib
from loguru import logger
import numpy as np

DATASET_DIR = os.getenv("DATASET_DIR", os.path.join(os.path.dirname(__file__), "../dataset"))
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(os.path.dirname(__file__), "model.pkl"))

DEFAULT_FILES = [
    "ewb-data-2025-26.xlsx",
    "gross.xlsx",
    "Gross_Net_Tax_collection.xlsx",
    "GSTR-1-2025-2026.xlsx",
    "GSTR-3B-2025-2026.xlsx",
    "Settlement-of-IGST-to-State-2025-2026.xlsx",
    "statewise_GST_collection_2025-26.xlsx",
]


def candidate_dirs() -> List[str]:
    here = os.path.dirname(__file__)
    backend_root = os.path.abspath(os.path.join(here, ".."))
    project_root = os.path.abspath(os.path.join(backend_root, ".."))
    return list(dict.fromkeys([
        DATASET_DIR,
        os.path.join(backend_root, "dataset"),
        os.path.join(project_root, "dataset"),
    ]))


def resolve_files(names: List[str]) -> List[str]:
    paths: List[str] = []
    dirs = candidate_dirs()
    for name in names:
        candidates = []
        # allow direct absolute/relative path usage
        if os.path.isabs(name) or "/" in name:
            candidates.append(name if name.lower().endswith(".xlsx") else f"{name}.xlsx")
        else:
            base = name if name.lower().endswith(".xlsx") else f"{name}.xlsx"
            for d in dirs:
                candidates.append(os.path.join(d, base))
        found = next((c for c in candidates if os.path.exists(c)), None)
        if found:
            paths.append(found)
        else:
            logger.warning(f"Dataset file not found for '{name}'. Tried: {candidates}")
    return paths


def list_available() -> Dict[str, Any]:
    out: Dict[str, Any] = {"dirs": candidate_dirs(), "files": {}}
    for d in candidate_dirs():
        try:
            if os.path.isdir(d):
                out["files"][d] = [f for f in os.listdir(d) if f.lower().endswith(".xlsx")]
        except Exception as e:
            out["files"][d] = [f"error: {e}"]
    return out


def load_and_concat(paths: List[str]) -> pd.DataFrame:
    frames = []
    for p in paths:
        try:
            sheets = pd.read_excel(p, sheet_name=None, engine="openpyxl")
            for sname, df in sheets.items():
                df = df.copy()
                df["__source__"] = os.path.basename(p)
                df["__sheet__"] = sname
                for col in df.columns:
                    ser = df[col]
                    ser = ser.astype(str).str.replace(r"[^\d\.\-]", "", regex=True)
                    df[col] = pd.to_numeric(ser, errors="coerce")
                frames.append(df)
        except Exception as e:
            logger.warning(f"Failed to read {p}: {e}")
    if not frames:
        raise ValueError("No dataset files could be loaded")
    big = pd.concat(frames, ignore_index=True)
    return big


def build_features_and_labels(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    num_cols = [c for c in num_cols if c not in {"__source__", "__sheet__"}]
    X = None
    if num_cols:
        X = df[num_cols].fillna(0)
    else:
        obj_cols = [c for c in df.columns if c not in {"__source__", "__sheet__"}]
        if not obj_cols:
            raise ValueError("No numeric columns found for features")
        length_sum = df[obj_cols].apply(lambda row: sum(len(str(x)) for x in row), axis=1)
        digit_sum = df[obj_cols].apply(lambda row: sum(sum(ch.isdigit() for ch in str(x)) for x in row), axis=1)
        X = pd.DataFrame({"length_sum": length_sum, "digit_sum": digit_sum})
    z = (X - X.mean()) / (X.std(ddof=0) + 1e-6)
    score = z.abs().sum(axis=1)
    q80 = np.quantile(score, 0.8)
    q50 = np.quantile(score, 0.5)
    y = pd.Series(np.where(score >= q80, 2, np.where(score >= q50, 1, 0)))
    return X, y


def train(names: List[str] = None) -> Dict[str, Any]:
    use_names = names if names else DEFAULT_FILES
    paths = resolve_files(use_names)
    df = load_and_concat(paths)
    X, y = build_features_and_labels(df)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y if len(set(y)) > 1 else None)
    pipeline = Pipeline([
        ("scaler", StandardScaler(with_mean=False)),
        ("rf", RandomForestClassifier(n_estimators=200, random_state=42))
    ])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)
    joblib.dump({"model": pipeline, "features": X.columns.tolist()}, MODEL_PATH)
    logger.info(f"Model trained and saved to {MODEL_PATH}")
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "model_path": MODEL_PATH,
        "metrics": report,
        "rows": int(df.shape[0]),
        "features": X.columns.tolist(),
    }


def predict(payload: Dict[str, Any]) -> Dict[str, Any]:
    obj = joblib.load(MODEL_PATH)
    if isinstance(obj, dict) and "model" in obj:
        model = obj["model"]
        features = obj.get("features", [])
    else:
        model = obj
        features = []
    if not features:
        features = list(payload.keys())
    row = {k: payload.get(k, 0) for k in features}
    X = pd.DataFrame([row]).fillna(0)
    pred = model.predict(X)[0]
    band = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}.get(int(pred), "LOW")
    return {"prediction": int(pred), "risk_band": band}


if __name__ == "__main__":
    out = train()
    print(out)
