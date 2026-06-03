import builtins


class DiagnosticDecisionEngine:
    """
    MODEL 3:
    Diagnostic + Decision Engine

    It detects:
    - Current problems
    - Future problems 12h / 24h / 48h
    - Current and future risk
    - RUL
    - Maintenance recommendation
    - Alert message
    """

    def get_level(self, value, medium, high, critical):
        if value >= critical:
            return "Critique"
        elif value >= high:
            return "Élevé"
        elif value >= medium:
            return "Moyen"
        else:
            return "Faible"

    def detect_problems(self, vibration, temperature, acceleration):
        problem_vibration = self.get_level(vibration, 1.8, 2.5, 3.5)
        problem_overheating = self.get_level(temperature, 65, 75, 85)

        if vibration >= 2.5 and acceleration >= 5:
            problem_mechanical = "Critique"
        elif vibration >= 2.0 and acceleration >= 4:
            problem_mechanical = "Élevé"
        elif vibration >= 1.5 and acceleration >= 3:
            problem_mechanical = "Moyen"
        else:
            problem_mechanical = "Faible"

        if vibration >= 3.0 or acceleration >= 7:
            problem_bearing_wear = "Critique"
        elif vibration >= 2.2 or acceleration >= 5:
            problem_bearing_wear = "Élevé"
        elif vibration >= 1.6 or acceleration >= 3:
            problem_bearing_wear = "Moyen"
        else:
            problem_bearing_wear = "Faible"

        if vibration >= 2.8 and acceleration >= 5:
            problem_misalignment = "Critique"
        elif vibration >= 2.2 and acceleration >= 4:
            problem_misalignment = "Élevé"
        elif vibration >= 1.7 and acceleration >= 3:
            problem_misalignment = "Moyen"
        else:
            problem_misalignment = "Faible"

        if temperature >= 85 and vibration >= 2.2:
            problem_lubrication = "Critique"
        elif temperature >= 75 and vibration >= 1.8:
            problem_lubrication = "Élevé"
        elif temperature >= 65 and vibration >= 1.5:
            problem_lubrication = "Moyen"
        else:
            problem_lubrication = "Faible"

        if vibration >= 3.5 or temperature >= 90 or acceleration >= 8:
            problem_sudden_failure = "Critique"
        elif vibration >= 2.8 or temperature >= 80 or acceleration >= 6:
            problem_sudden_failure = "Élevé"
        elif vibration >= 2.0 or temperature >= 70 or acceleration >= 4:
            problem_sudden_failure = "Moyen"
        else:
            problem_sudden_failure = "Faible"

        return {
            "problem_vibration": problem_vibration,
            "problem_overheating": problem_overheating,
            "problem_mechanical": problem_mechanical,
            "problem_bearing_wear": problem_bearing_wear,
            "problem_misalignment": problem_misalignment,
            "problem_lubrication": problem_lubrication,
            "problem_sudden_failure": problem_sudden_failure,
        }

    def global_risk(self, problems, ai_anomaly_label=None):
        levels = list(problems.values())

        if ai_anomaly_label == "Anomalie détectée":
            if "Critique" not in levels:
                levels.append("Élevé")

        if "Critique" in levels:
            return "Critique"
        elif "Élevé" in levels:
            return "Élevé"
        elif "Moyen" in levels:
            return "Moyen"
        else:
            return "Faible"

    def calculate_risk_score(self, vibration, temperature, acceleration, ai_anomaly_score=0):
        rule_score = int(
            (vibration / 3.5) * 45 +
            (temperature / 85) * 35 +
            (acceleration / 8) * 20
        )

        score = builtins.max(rule_score, ai_anomaly_score)
        return builtins.max(0, builtins.min(100, score))

    def estimate_rul(self, current_risk, risk_12h, risk_24h, risk_48h, risk_score):
        if current_risk == "Critique" or risk_score >= 85:
            return 48

        if risk_12h == "Critique":
            return 100

        if risk_24h == "Critique":
            return 180

        if risk_48h == "Critique":
            return 300

        if current_risk == "Élevé" or risk_score >= 65:
            return 400

        if current_risk == "Moyen" or risk_score >= 40:
            return 900

        return 3000

    def maintenance_priority(self, current_risk, risk_12h, risk_24h, rul_hours):
        if current_risk == "Critique" or risk_12h == "Critique" or rul_hours <= 100:
            return "Priorité haute"

        if current_risk == "Élevé" or risk_24h in ["Élevé", "Critique"] or rul_hours <= 400:
            return "Priorité moyenne"

        return "Priorité faible"

    def maintenance_recommendation(self, current_risk, risk_12h, risk_24h, rul_hours, ai_anomaly_label):
        if current_risk == "Critique" or rul_hours <= 100:
            return "Maintenance urgente requise"

        if ai_anomaly_label == "Anomalie détectée":
            return "Anomalie IA détectée - inspection recommandée"

        if risk_12h == "Critique":
            return "Intervention à planifier dans les prochaines 12 heures"

        if risk_24h in ["Élevé", "Critique"]:
            return "Intervention à planifier rapidement"

        if current_risk == "Moyen" or risk_12h == "Moyen":
            return "Surveillance renforcée recommandée"

        return "Paramètres normaux"

    def generate_alert(self, machine_name, part_name, problems, risk, rul_hours, vibration, temperature, acceleration):
        alerts = []

        if problems["problem_vibration"] in ["Élevé", "Critique"]:
            alerts.append(f"vibration élevée {vibration:.2f} mm/s")

        if problems["problem_overheating"] in ["Élevé", "Critique"]:
            alerts.append(f"température élevée {temperature:.1f}°C")

        if problems["problem_misalignment"] in ["Élevé", "Critique"]:
            alerts.append("désalignement probable")

        if problems["problem_bearing_wear"] in ["Élevé", "Critique"]:
            alerts.append("usure des roulements probable")

        if problems["problem_lubrication"] in ["Élevé", "Critique"]:
            alerts.append("problème de lubrification probable")

        if problems["problem_sudden_failure"] in ["Élevé", "Critique"]:
            alerts.append("risque de panne soudaine")

        if not alerts:
            return "Aucune alerte critique"

        return f"{machine_name} - {part_name}: " + ", ".join(alerts) + f" | RUL estimée: ~{rul_hours}h | Sévérité: {risk}"

    def analyze(
        self,
        machine_name,
        part_name,
        current_vibration,
        current_temperature,
        current_acceleration,
        predicted_values,
        ai_anomaly_label="Normal",
        ai_anomaly_score=0
    ):
        current_problems = self.detect_problems(
            current_vibration,
            current_temperature,
            current_acceleration
        )

        problems_12h = self.detect_problems(
            predicted_values["vibration_12h"],
            predicted_values["temperature_12h"],
            predicted_values["acceleration_12h"]
        )

        problems_24h = self.detect_problems(
            predicted_values["vibration_24h"],
            predicted_values["temperature_24h"],
            predicted_values["acceleration_24h"]
        )

        problems_48h = self.detect_problems(
            predicted_values["vibration_48h"],
            predicted_values["temperature_48h"],
            predicted_values["acceleration_48h"]
        )

        current_risk = self.global_risk(current_problems, ai_anomaly_label)
        risk_12h = self.global_risk(problems_12h)
        risk_24h = self.global_risk(problems_24h)
        risk_48h = self.global_risk(problems_48h)

        risk_score = self.calculate_risk_score(
            current_vibration,
            current_temperature,
            current_acceleration,
            ai_anomaly_score
        )

        rul_hours = self.estimate_rul(
            current_risk,
            risk_12h,
            risk_24h,
            risk_48h,
            risk_score
        )

        priority = self.maintenance_priority(
            current_risk,
            risk_12h,
            risk_24h,
            rul_hours
        )

        recommendation = self.maintenance_recommendation(
            current_risk,
            risk_12h,
            risk_24h,
            rul_hours,
            ai_anomaly_label
        )

        alert_message = self.generate_alert(
            machine_name,
            part_name,
            current_problems,
            current_risk,
            rul_hours,
            current_vibration,
            current_temperature,
            current_acceleration
        )

        health_score = 100 - risk_score
        health_score = builtins.max(0, builtins.min(100, health_score))

        return {
            "current_risk": current_risk,
            "risk_12h": risk_12h,
            "risk_24h": risk_24h,
            "risk_48h": risk_48h,

            "risk_score": risk_score,
            "health_score": health_score,
            "rul_hours": rul_hours,

            "maintenance_priority": priority,
            "maintenance_recommendation": recommendation,
            "alert_message": alert_message,

            "current_problem_vibration": current_problems["problem_vibration"],
            "current_problem_overheating": current_problems["problem_overheating"],
            "current_problem_mechanical": current_problems["problem_mechanical"],
            "current_problem_bearing_wear": current_problems["problem_bearing_wear"],
            "current_problem_misalignment": current_problems["problem_misalignment"],
            "current_problem_lubrication": current_problems["problem_lubrication"],
            "current_problem_sudden_failure": current_problems["problem_sudden_failure"],

            "future_12h_problem_vibration": problems_12h["problem_vibration"],
            "future_12h_problem_overheating": problems_12h["problem_overheating"],
            "future_12h_problem_mechanical": problems_12h["problem_mechanical"],
            "future_12h_problem_bearing_wear": problems_12h["problem_bearing_wear"],
            "future_12h_problem_misalignment": problems_12h["problem_misalignment"],
            "future_12h_problem_lubrication": problems_12h["problem_lubrication"],
            "future_12h_problem_sudden_failure": problems_12h["problem_sudden_failure"],

            "future_24h_problem_vibration": problems_24h["problem_vibration"],
            "future_24h_problem_overheating": problems_24h["problem_overheating"],
            "future_24h_problem_mechanical": problems_24h["problem_mechanical"],
            "future_24h_problem_bearing_wear": problems_24h["problem_bearing_wear"],
            "future_24h_problem_misalignment": problems_24h["problem_misalignment"],
            "future_24h_problem_lubrication": problems_24h["problem_lubrication"],
            "future_24h_problem_sudden_failure": problems_24h["problem_sudden_failure"],

            "future_48h_problem_vibration": problems_48h["problem_vibration"],
            "future_48h_problem_overheating": problems_48h["problem_overheating"],
            "future_48h_problem_mechanical": problems_48h["problem_mechanical"],
            "future_48h_problem_bearing_wear": problems_48h["problem_bearing_wear"],
            "future_48h_problem_misalignment": problems_48h["problem_misalignment"],
            "future_48h_problem_lubrication": problems_48h["problem_lubrication"],
            "future_48h_problem_sudden_failure": problems_48h["problem_sudden_failure"],
        }