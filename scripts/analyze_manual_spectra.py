import os
import re
import pandas as pd
import psycopg2
from pathlib import Path


BASE_PATH = Path("/opt/airflow/data/manual_spectra")

DB_CONFIG = {
    "host": "host.docker.internal",
    "database": "predictionsystem_db",
    "user": "postgres",
    "password": "ensiensi",
    "port": 5432
}

RPM_BY_MACHINE = {
    "Pompe_HRS_601ABP04": 990,
    "Pompe_circulation_bac_commun_601AAP01": 990,
    "Pompe_circulation_bac_commun_601AAP02": 990,
}


def extract_part_code(column_name):
    return str(column_name).split()[0].strip()


def read_spectrum(file_path):
    df = pd.read_csv(file_path)

    freq_col = df.columns[0]
    value_col = df.columns[1]

    part_code = extract_part_code(value_col)

    df = df.rename(columns={
        freq_col: "frequency",
        value_col: "amplitude"
    })

    df["frequency"] = pd.to_numeric(df["frequency"], errors="coerce")
    df["amplitude"] = pd.to_numeric(df["amplitude"], errors="coerce")
    df = df.dropna(subset=["frequency", "amplitude"])

    return df, part_code


def get_peak_near(df, target_freq, tolerance=1.0):
    band = df[
        (df["frequency"] >= target_freq - tolerance) &
        (df["frequency"] <= target_freq + tolerance)
    ]

    if band.empty:
        return 0.0

    return float(band["amplitude"].max())


def get_global_peak(df):
    if df.empty:
        return 0.0
    return float(df["amplitude"].max())


def has_high_frequency_peaks(df, min_freq=500):
    high = df[df["frequency"] >= min_freq]
    if high.empty:
        return False

    global_peak = get_global_peak(df)
    high_peak = float(high["amplitude"].max())

    return high_peak >= global_peak * 0.35


def has_broadband_noise(df):
    if df.empty:
        return False

    mean_amp = df["amplitude"].mean()
    max_amp = df["amplitude"].max()

    if max_amp == 0:
        return False

    return mean_amp >= max_amp * 0.20


def diagnose(velocity_df, acceleration_df, rpm):
    rotation_freq = rpm / 60.0

    amp_1x = get_peak_near(velocity_df, rotation_freq)
    amp_2x = get_peak_near(velocity_df, rotation_freq * 2)
    amp_3x = get_peak_near(velocity_df, rotation_freq * 3)
    amp_4x = get_peak_near(velocity_df, rotation_freq * 4)

    global_velocity_peak = get_global_peak(velocity_df)

    peak_1x = amp_1x >= global_velocity_peak * 0.30 if global_velocity_peak > 0 else False
    peak_2x = amp_2x >= global_velocity_peak * 0.25 if global_velocity_peak > 0 else False

    harmonics = (
        amp_2x >= global_velocity_peak * 0.20 and
        amp_3x >= global_velocity_peak * 0.15
    ) if global_velocity_peak > 0 else False

    high_frequency_peaks = has_high_frequency_peaks(acceleration_df)
    broadband_noise = has_broadband_noise(acceleration_df)

    probable_fault = "Aucun défaut spécifique détecté"
    confidence = "Faible"
    recommendation = "Continuer la surveillance vibratoire."

    if peak_1x and not peak_2x and not harmonics:
        probable_fault = "Balourd probable"
        confidence = "Moyenne"
        recommendation = "Vérifier l’équilibrage du rotor."

    if peak_1x and peak_2x:
        probable_fault = "Désalignement probable"
        confidence = "Moyenne"
        recommendation = "Vérifier l’alignement moteur-pompe et l’accouplement."

    if harmonics:
        probable_fault = "Serrage insuffisant probable"
        confidence = "Moyenne"
        recommendation = "Vérifier les fixations, le socle et les boulons."

    if high_frequency_peaks:
        probable_fault = "Défaut de roulement probable"
        confidence = "Moyenne"
        recommendation = "Contrôler les roulements et la lubrification."

    if broadband_noise:
        probable_fault = "Cavitation ou turbulence probable"
        confidence = "Faible à moyenne"
        recommendation = "Vérifier les conditions hydrauliques et le débit."

    return {
        "peak_1x": peak_1x,
        "peak_2x": peak_2x,
        "harmonics": harmonics,
        "high_frequency_peaks": high_frequency_peaks,
        "broadband_noise": broadband_noise,
        "probable_fault": probable_fault,
        "confidence": confidence,
        "recommendation": recommendation
    }


def create_table(conn):
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS manual_diagnostics (
            id SERIAL PRIMARY KEY,
            department VARCHAR(50),
            machine_name VARCHAR(150),
            part_code VARCHAR(50),

            peak_1x BOOLEAN DEFAULT FALSE,
            peak_2x BOOLEAN DEFAULT FALSE,
            harmonics BOOLEAN DEFAULT FALSE,
            high_frequency_peaks BOOLEAN DEFAULT FALSE,
            broadband_noise BOOLEAN DEFAULT FALSE,

            probable_fault VARCHAR(150),
            confidence VARCHAR(50),
            recommendation TEXT,

            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    conn.commit()
    cur.close()


def save_diagnosis(conn, department, machine_name, part_code, diagnosis):
    cur = conn.cursor()

    cur.execute("""
        DELETE FROM manual_diagnostics
        WHERE department = %s
        AND machine_name = %s
        AND part_code = %s
    """, (department, machine_name, part_code))

    cur.execute("""
    INSERT INTO manual_diagnostics (
        department,
        machine_name,
        part_code,
        peak_1x,
        peak_2x,
        harmonics,
        high_frequency_peaks,
        broadband_noise,
        probable_fault,
        confidence,
        recommendation
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
""", (
    department,
    machine_name,
    part_code,
    bool(diagnosis["peak_1x"]),
    bool(diagnosis["peak_2x"]),
    bool(diagnosis["harmonics"]),
    bool(diagnosis["high_frequency_peaks"]),
    bool(diagnosis["broadband_noise"]),
    str(diagnosis["probable_fault"]),
    str(diagnosis["confidence"]),
    str(diagnosis["recommendation"])
))

    conn.commit()
    cur.close()


def process_machine(conn, department, machine_name):
    machine_path = BASE_PATH / department / machine_name

    velocity_file = machine_path / "VelocitySpectrum.csv"
    acceleration_file = machine_path / "AccelerationSpectrum.csv"

    if not velocity_file.exists() or not acceleration_file.exists():
        print(f"Missing spectrum files for {department}/{machine_name}")
        return

    velocity_df, velocity_part = read_spectrum(velocity_file)
    acceleration_df, acceleration_part = read_spectrum(acceleration_file)

    part_code = velocity_part or acceleration_part

    if velocity_part != acceleration_part:
        print(f"Warning: velocity part {velocity_part} != acceleration part {acceleration_part}")
        part_code = velocity_part

    rpm = RPM_BY_MACHINE.get(machine_name, 990)

    diagnosis = diagnose(velocity_df, acceleration_df, rpm)

    save_diagnosis(
        conn,
        department,
        machine_name,
        part_code,
        diagnosis
    )

    print(f"{department}/{machine_name}/{part_code}: {diagnosis['probable_fault']} ({diagnosis['confidence']})")


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    create_table(conn)

    for department_path in BASE_PATH.iterdir():
        if not department_path.is_dir():
            continue

        department = department_path.name

        for machine_path in department_path.iterdir():
            if not machine_path.is_dir():
                continue

            machine_name = machine_path.name
            process_machine(conn, department, machine_name)

    conn.close()


if __name__ == "__main__":
    main()